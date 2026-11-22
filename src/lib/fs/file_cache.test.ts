import * as path from "@std/path";
import { assertEquals } from "@std/assert";
import type ProgressBar from "@deno-library/progress";

import TestHelper from "../test/test_helper.ts";
import { assertFolderIncludes, assertStringEndsWith } from "../test/more_asserts.ts";
import type ProgressReader from "../io/progress_reader.ts";

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
  get motificationTime() {
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
