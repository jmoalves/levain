import * as path from "@std/path";
import { existsSync } from "@std/fs";
import { assert, assertEquals } from "@std/assert";
import type ProgressBar from "@deno-library/progress";

import TestHelper from "../test/test_helper.ts";
import FileWriter from "./file_writer.ts";

Deno.test("FileWriter should write to temp file, update progress, and atomically move on close", async () => {
  const dir = TestHelper.getNewTempDir();
  const target = path.join(dir, "nested", "output.txt");
  const writer = new FileWriter(target);

  assertEquals(writer.title, "- TO output.txt");
  assertEquals(writer.motificationTime, null);
  writer.size = 11;
  assertEquals(writer.size, 11);

  const renders: number[] = [];
  writer.progressBar = {
    render(completed: number) {
      renders.push(completed);
      return Promise.resolve();
    },
  } as unknown as ProgressBar;

  const data = new TextEncoder().encode("hello world");
  const written = await writer.write(data);
  assertEquals(written, 11);
  assertEquals(writer.bytesCompleted, 11);
  assertEquals(renders, [11]);
  assertEquals(existsSync(target), false, "target should not exist before close()");

  await writer.close();

  assert(existsSync(target), "target should exist after close()");
  assertEquals(await Deno.readTextFile(target), "hello world");
  assertEquals(writer.size, 11);
  assert(writer.motificationTime instanceof Date);
});

Deno.test("FileWriter.close should overwrite an existing destination file", async () => {
  const dir = TestHelper.getNewTempDir();
  const target = path.join(dir, "existing.txt");
  await Deno.writeTextFile(target, "old content");

  const writer = new FileWriter(target);
  await writer.write(new TextEncoder().encode("new"));
  await writer.close();

  assertEquals(await Deno.readTextFile(target), "new");
});

Deno.test("FileWriter.abort should close handle and delete temporary file without creating target", async () => {
  const dir = TestHelper.getNewTempDir();
  const target = path.join(dir, "aborted.txt");
  const writer = new FileWriter(target);

  await writer.write(new TextEncoder().encode("partial"));
  writer.abort();
  // Calling abort twice must be safe
  writer.abort();

  assertEquals(existsSync(target), false);
  const remainingFiles = [...Deno.readDirSync(dir)];
  assertEquals(remainingFiles.length, 0, "no temp files should remain after abort()");
});
