import * as path from "@std/path";
import { assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";
import type ProgressBar from "@deno-library/progress";

import TestHelper from "../test/test_helper.ts";
import { assertFolderIncludes, assertStringEndsWith } from "../test/more_asserts.ts";
import { FileUtils } from "./file_utils.ts";
import type ProgressReader from "../io/progress_reader.ts";
import { FileProgress } from "../io/file_progress.ts";

import FileCache from "./file_cache.ts";

class SpyProgressReader implements ProgressReader {
  rewindCount = 0;
  closeCount = 0;
  private offset = 0;
  private readonly bytes: Uint8Array;
  private pb: ProgressBar | undefined;

  constructor(
    public readonly name: string,
    content: string,
    private readonly mtime: Date,
  ) {
    this.bytes = new TextEncoder().encode(content);
  }

  get progressBar() {
    return this.pb;
  }
  set progressBar(pb: ProgressBar | undefined) {
    this.pb = pb;
  }
  get title() {
    return this.name;
  }
  get size() {
    return this.bytes.length;
  }
  set size(_v: number | undefined) {}
  get bytesCompleted() {
    return this.offset;
  }
  get modificationTime() {
    return this.mtime;
  }

  rewind(): void {
    this.rewindCount++;
    this.offset = 0;
  }

  read(p: Uint8Array): Promise<number | null> {
    if (this.offset >= this.bytes.length) {
      return Promise.resolve(null);
    }
    const n = Math.min(p.length, this.bytes.length - this.offset);
    p.set(this.bytes.subarray(this.offset, this.offset + n));
    this.offset += n;
    return Promise.resolve(n);
  }

  close(): void {
    this.closeCount++;
  }
}

Deno.test("FileCache should get file from cache", async () => {
  const config = TestHelper.getConfig();
  config.configPaths.levainCacheDir = TestHelper.getNewTempDir();
  const fileCache = new FileCache(config);

  const cachedFile = await fileCache.get(TestHelper.validZipFile);

  const expectedFile = fileCache.cachedFilePath(TestHelper.validZipFile);
  assertEquals(cachedFile, expectedFile);

  assertFolderIncludes(fileCache.dir, [expectedFile]);

  // Workaround - https://github.com/denoland/deno/issues/15425
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("FileCache should calc cached file path", () => {
  const config = TestHelper.getConfig();
  const fileCache = new FileCache(config);

  assertEquals(
    fileCache.cachedFilePath("/folder/big-file.zip"),
    path.join(fileCache.dir, "_folder_big-file.zip"),
  );
  assertStringEndsWith(
    fileCache.cachedFilePath("d:/folder/big-file.zip"),
    path.join(fileCache.dir, "d_folder_big-file.zip"),
  );
});

Deno.test("FileCache.get rewinds only once on cache miss and closes reader on cache hit", async () => {
  const config = TestHelper.getConfig();
  config.configPaths.levainCacheDir = TestHelper.getNewTempDir();
  const fileCache = new FileCache(config);
  const fixedMtime = new Date("2025-01-01T00:00:00.000Z");

  // Cache miss: must rewind only once (no double HTTP GET) and close once
  const missReader = new SpyProgressReader("https://example.org/app.zip", "archive-bytes", fixedMtime);
  const cachedPath = await fileCache.get(missReader);
  assertEquals(missReader.rewindCount, 1);
  assertEquals(missReader.closeCount, 1);
  assertEquals(Deno.readTextFileSync(cachedPath), "archive-bytes");

  // Cache hit: must close reader instead of leaking open handle/stream
  const hitReader = new SpyProgressReader("https://example.org/app.zip", "archive-bytes", fixedMtime);
  const hitPath = await fileCache.get(hitReader);
  assertEquals(hitPath, cachedPath);
  assertEquals(hitReader.rewindCount, 1);
  assertEquals(hitReader.closeCount, 1);
});

Deno.test("FileCache.copyToCache should reuse valid cache file populated concurrently by another instance", async () => {
  const config = TestHelper.getConfig();
  config.configPaths.levainCacheDir = path.join(TestHelper.getNewTempDir(), "nested-cache");
  const fileCache = new FileCache(config);
  const fixedMtime = new Date("2025-02-02T00:00:00.000Z");
  const reader = new SpyProgressReader("https://example.org/shared.zip", "concurrent-payload", fixedMtime);
  const target = fileCache.cachedFilePath(reader.name);

  const copyStub = stub(FileProgress, "copyWithProgress", () => {
    Deno.writeTextFileSync(target, "concurrent-payload");
    Deno.utimeSync(target, new Date(), fixedMtime);
    return Promise.reject(new Error("simulated concurrent rename contention"));
  });

  try {
    const result = await fileCache.copyToCache(reader, true);
    assertEquals(result, target);
    assertEquals(Deno.readTextFileSync(result), "concurrent-payload");
  } finally {
    copyStub.restore();
  }
});

Deno.test("FileCache should replace conflicting directory, tolerate utime errors on hit, and rethrow non-concurrent copy errors", async () => {
  const config = TestHelper.getConfig();
  config.configPaths.levainCacheDir = TestHelper.getNewTempDir();
  const fileCache = new FileCache(config);
  const fixedMtime = new Date("2025-03-03T00:00:00.000Z");

  // Pre-create a conflicting directory at the cache target path
  const reader = new SpyProgressReader("https://example.org/dir-conflict.zip", "fresh-bytes", fixedMtime);
  const target = fileCache.cachedFilePath(reader.name);
  Deno.mkdirSync(target, { recursive: true });

  const cachedPath = await fileCache.get(reader);
  assertEquals(cachedPath, target);
  assertEquals(Deno.readTextFileSync(cachedPath), "fresh-bytes");

  // Best-effort utime failure on cache hit must not fail the cache hit
  const hitReader = new SpyProgressReader("https://example.org/dir-conflict.zip", "fresh-bytes", fixedMtime);
  const utimeStub = stub(Deno, "utimeSync", () => {
    throw new Error("simulated utime error");
  });
  try {
    assertEquals(await fileCache.get(hitReader), target);
  } finally {
    utimeStub.restore();
  }

  // Real copy failure when cache is still invalid must propagate
  const failReader = new SpyProgressReader("https://example.org/broken.zip", "broken-bytes", fixedMtime);
  const copyStub = stub(FileProgress, "copyWithProgress", () => Promise.reject(new Error("network failed")));
  try {
    await assertRejects(async () => await fileCache.copyToCache(failReader, true), Error, "network failed");
  } finally {
    copyStub.restore();
  }
});

Deno.test("FileCache closes reader on get() error, rejects mismatched mtime, and handles cacheValid stat errors", async () => {
  const config = TestHelper.getConfig();
  config.configPaths.levainCacheDir = TestHelper.getNewTempDir();
  const fileCache = new FileCache(config);
  const mtime1 = new Date("2025-04-01T00:00:00.000Z");
  const mtime2 = new Date("2025-05-01T00:00:00.000Z");

  // Populate cache with mtime1
  const r1 = new SpyProgressReader("https://example.org/mtime-test.zip", "12345", mtime1);
  const cachedPath = await fileCache.get(r1);

  // Different mtime with same size -> cacheValid returns false
  const r2 = new SpyProgressReader("https://example.org/mtime-test.zip", "12345", mtime2);
  assertEquals(fileCache.cacheValid(r2, cachedPath), false);

  // Stat failure inside cacheValid returns false gracefully
  const infoStub = stub(FileUtils, "getFileInfoSync", () => {
    throw new Error("stat error");
  });
  try {
    assertEquals(fileCache.cacheValid(r1, cachedPath), false);
  } finally {
    infoStub.restore();
  }

  // Error inside get() closes reader (even if close() itself throws) and propagates original error
  const brokenReader = new SpyProgressReader("https://example.org/fail.zip", "abc", mtime1);
  brokenReader.close = () => {
    brokenReader.closeCount++;
    throw new Error("close error ignored");
  };
  const copyStub = stub(FileProgress, "copyWithProgress", () => Promise.reject(new Error("download boom")));
  try {
    await assertRejects(() => fileCache.get(brokenReader), Error, "download boom");
    assertEquals(brokenReader.closeCount, 1);
  } finally {
    copyStub.restore();
  }
});
