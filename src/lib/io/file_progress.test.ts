import * as path from "@std/path";
import { existsSync } from "@std/fs";
import { assertEquals, assertRejects } from "@std/assert";
import type ProgressBar from "@deno-library/progress";

import TestHelper from "../test/test_helper.ts";
import { FileProgress } from "./file_progress.ts";
import type ProgressReader from "./progress_reader.ts";

Deno.test("FileProgress.copyWithProgress should copy a local file and preserve modification time", async () => {
  const dir = TestHelper.getNewTempDir();
  const src = path.join(dir, "source.bin");
  const dst = path.join(dir, "dest.bin");
  await Deno.writeTextFile(src, "levain file progress copy test");

  const fixedMtime = new Date("2025-01-15T12:30:00Z");
  Deno.utimeSync(src, fixedMtime, fixedMtime);

  await FileProgress.copyWithProgress(src, dst);

  assertEquals(await Deno.readTextFile(dst), "levain file progress copy test");
  const dstInfo = Deno.statSync(dst);
  assertEquals(Math.floor((dstInfo.mtime?.getTime() ?? 0) / 1000), Math.floor(fixedMtime.getTime() / 1000));
});

Deno.test("FileProgress.copyWithProgress should honor alreadyRewound on first attempt", async () => {
  const dir = TestHelper.getNewTempDir();
  const dst = path.join(dir, "from-reader.txt");
  const bytes = new TextEncoder().encode("already rewound");
  let offset = 0;
  let rewindCount = 0;
  let closeCount = 0;

  const reader: ProgressReader = {
    name: "memory",
    title: "memory",
    size: bytes.length,
    bytesCompleted: 0,
    progressBar: undefined as ProgressBar | undefined,
    motificationTime: null,
    rewind() {
      rewindCount++;
      offset = 0;
    },
    read(p: Uint8Array) {
      if (offset >= bytes.length) {
        return Promise.resolve(null);
      }
      const n = Math.min(p.length, bytes.length - offset);
      p.set(bytes.subarray(offset, offset + n));
      offset += n;
      return Promise.resolve(n);
    },
    close() {
      closeCount++;
      return Promise.resolve();
    },
  };

  await FileProgress.copyWithProgress(reader, dst, true);

  assertEquals(rewindCount, 0);
  assertEquals(closeCount, 1);
  assertEquals(await Deno.readTextFile(dst), "already rewound");
});

Deno.test("FileProgress.copyWithProgress should retry after transient error and succeed", async () => {
  const dir = TestHelper.getNewTempDir();
  const dst = path.join(dir, "retry-ok.txt");
  const bytes = new TextEncoder().encode("recovered");
  let attempt = 0;
  let offset = 0;

  const flakyReader: ProgressReader = {
    name: "flaky",
    title: "flaky",
    size: bytes.length,
    bytesCompleted: 0,
    progressBar: undefined,
    motificationTime: null,
    rewind() {
      attempt++;
      offset = 0;
    },
    read(p: Uint8Array) {
      if (attempt === 1) {
        return Promise.reject(new Error("transient read failure"));
      }
      if (offset >= bytes.length) {
        return Promise.resolve(null);
      }
      const n = Math.min(p.length, bytes.length - offset);
      p.set(bytes.subarray(offset, offset + n));
      offset += n;
      return Promise.resolve(n);
    },
    close() {
      return Promise.resolve();
    },
  };

  await FileProgress.copyWithProgress(flakyReader, dst);

  assertEquals(attempt, 2);
  assertEquals(await Deno.readTextFile(dst), "recovered");
  // No leftover temp files
  assertEquals([...Deno.readDirSync(dir)].map((e) => e.name), ["retry-ok.txt"]);
});

Deno.test("FileProgress.copyWithProgress should fail after 3 retries on size mismatch and clean up", async () => {
  const dir = TestHelper.getNewTempDir();
  const dst = path.join(dir, "mismatch.txt");
  const bytes = new TextEncoder().encode("short");
  let offset = 0;
  let rewindCount = 0;

  const badSizeReader: ProgressReader = {
    name: "bad-size",
    title: "bad-size",
    size: 999,
    bytesCompleted: 0,
    progressBar: undefined,
    motificationTime: null,
    rewind() {
      rewindCount++;
      offset = 0;
    },
    read(p: Uint8Array) {
      if (offset >= bytes.length) {
        return Promise.resolve(null);
      }
      const n = Math.min(p.length, bytes.length - offset);
      p.set(bytes.subarray(offset, offset + n));
      offset += n;
      return Promise.resolve(n);
    },
    close() {
      return Promise.resolve();
    },
  };

  await assertRejects(
    async () => await FileProgress.copyWithProgress(badSizeReader, dst),
    Error,
    `Unable to copy to ${dst}`,
  );
  assertEquals(rewindCount, 3);
  // Temp files must be cleaned up on failure (target was renamed before mismatch check on attempt)
  const tempFiles = [...Deno.readDirSync(dir)].filter((e) => e.name.startsWith("levain-temp-"));
  assertEquals(tempFiles.length, 0);
  assertEquals(existsSync(path.join(dir, "nonexistent")), false);
});
