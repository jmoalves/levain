import { assertFalse, assertRejects, assertThrows } from "@std/assert";
import * as path from "@std/path";
import { existsSync } from "@std/fs";
import * as zip from "@zip.js/zip.js";

import { DenoZip } from "./denozip_extractor.ts";
import TestHelper from "../test/test_helper.ts";
import { assertFolderIncludes } from "../test/more_asserts.ts";

async function createZipSlipArchive(zipPath: string, safePlaceholder: string, unsafeEntryName: string, content = "payload") {
  if (safePlaceholder.length !== unsafeEntryName.length) {
    throw new Error("Placeholder and unsafe entry name must have identical byte length");
  }
  const blobWriter = new zip.BlobWriter("application/zip");
  const writer = new zip.ZipWriter(blobWriter);
  await writer.add(safePlaceholder, new zip.TextReader(content));
  const blob = await writer.close();
  const bytes = new Uint8Array(await blob.arrayBuffer());

  // Patch the placeholder entry name in both the local and central ZIP headers
  // (ZIP CRC-32 covers entry data only, not filenames).
  const encoder = new TextEncoder();
  const from = encoder.encode(safePlaceholder);
  const to = encoder.encode(unsafeEntryName);
  let patched = 0;
  for (let i = 0; i <= bytes.length - from.length; i++) {
    let match = true;
    for (let j = 0; j < from.length; j++) {
      if (bytes[i + j] !== from[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      bytes.set(to, i);
      patched++;
      i += from.length - 1;
    }
  }
  if (patched < 2) {
    throw new Error(`Expected to patch local + central zip headers, patched=${patched}`);
  }

  await Deno.writeFile(zipPath, bytes);
}

Deno.test("DenoZip should extract a zip file", async () => {
  // Given
  const config = TestHelper.getConfig();
  const extractor = new DenoZip(config);
  const zipFile = "testdata/extract/test.zip";
  const tempDir = TestHelper.getNewTempDir();
  // When
  await extractor.extractImpl(zipFile, tempDir);
  // Then
  assertFolderIncludes(tempDir, ["test/abc.txt", "test/hello.txt"]);
});

Deno.test("DenoZip should reject Zip Slip traversal entries without writing outside destination", async () => {
  const config = TestHelper.getConfig();
  const extractor = new DenoZip(config);
  const parentDir = TestHelper.getNewTempDir();
  const dstDir = path.join(parentDir, "out");
  await Deno.mkdir(dstDir, { recursive: true });

  // POSIX traversal (caught by zip.js and/or DenoZip defense-in-depth)
  const posixZip = path.join(parentDir, "malicious-posix.zip");
  await createZipSlipArchive(posixZip, "aa/escaped.txt", "../escaped.txt", "evil");
  await assertRejects(
    async () => {
      await extractor.extractImpl(posixZip, dstDir);
    },
    Error,
    "Unsafe",
  );
  assertFalse(existsSync(path.join(parentDir, "escaped.txt")));

  // Windows backslash traversal
  const winZip = path.join(parentDir, "malicious-win.zip");
  await createZipSlipArchive(winZip, "aa/win-esc.txt", "..\\win-esc.txt", "evil");
  await assertRejects(
    async () => {
      await extractor.extractImpl(winZip, dstDir);
    },
    Error,
    "Unsafe",
  );
  assertFalse(existsSync(path.join(parentDir, "win-esc.txt")));
});

Deno.test("DenoZip.resolveSafeEntryPath should reject traversal, absolute, drive, and null-byte paths", () => {
  const dst = TestHelper.getNewTempDir();
  const unsafePaths = [
    "../outside.txt",
    "a/../../outside.txt",
    "..\\outside.txt",
    "/etc/passwd",
    "\\Windows\\win.ini",
    "C:\\Windows\\evil.txt",
    "C:/Windows/evil.txt",
    "bad\0name.txt",
    ".",
    "",
  ];

  for (const unsafePath of unsafePaths) {
    assertThrows(
      () => DenoZip.resolveSafeEntryPath(dst, unsafePath, false),
      Error,
      "Unsafe zip entry path",
    );
  }
});
