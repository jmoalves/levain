import * as path from "@std/path";
import { assert, assertEquals, assertThrows } from "@std/assert";
import type ProgressBar from "@deno-library/progress";

import TestHelper from "../test/test_helper.ts";
import FileReader from "./file_reader.ts";

Deno.test("FileReader should throw when file does not exist", () => {
  const missing = path.join(TestHelper.getNewTempDir(), "missing.txt");
  assertThrows(
    () => new FileReader(missing),
    Error,
    "does not exist",
  );
});

Deno.test("FileReader should read, track progress, rewind, and close idempotently", async () => {
  const tempFile = TestHelper.getNewTempFile();
  const payload = "hello levain reader";
  await Deno.writeTextFile(tempFile, payload);

  const reader = new FileReader(tempFile);
  assertEquals(reader.name, path.resolve(tempFile));
  assertEquals(reader.title, `- FROM ${path.basename(tempFile)}`);
  assertEquals(reader.size, payload.length);
  assert(reader.motificationTime instanceof Date);
  assertThrows(
    () => {
      reader.size = 10;
    },
    Error,
    "Unsupported",
  );

  // Reading before rewind returns null
  assertEquals(await reader.read(new Uint8Array(8)), null);

  const renders: number[] = [];
  reader.progressBar = {
    render(completed: number) {
      renders.push(completed);
      return Promise.resolve();
    },
  } as unknown as ProgressBar;

  try {
    reader.rewind();
    const chunks: Uint8Array[] = [];
    const buf = new Uint8Array(5);
    while (true) {
      const n = await reader.read(buf);
      if (n === null) {
        break;
      }
      chunks.push(buf.slice(0, n));
    }

    const decoded = new TextDecoder().decode(
      chunks.reduce((acc, chunk) => {
        const merged = new Uint8Array(acc.length + chunk.length);
        merged.set(acc);
        merged.set(chunk, acc.length);
        return merged;
      }, new Uint8Array(0)),
    );

    assertEquals(decoded, payload);
    assertEquals(reader.bytesCompleted, payload.length);
    assertEquals(renders[renders.length - 1], payload.length);

    // Rewind resets bytesCompleted and reads again from the start
    reader.rewind();
    assertEquals(reader.bytesCompleted, 0);
    const firstChunk = new Uint8Array(5);
    const n = await reader.read(firstChunk);
    assertEquals(n, 5);
    assertEquals(new TextDecoder().decode(firstChunk), "hello");
  } finally {
    await reader.close();
    // Second close must be a safe no-op
    await reader.close();
  }
});
