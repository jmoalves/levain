import { assertEquals, assertFalse, assertRejects, assertThrows } from "@std/assert";
import * as path from "@std/path";
import { existsSync } from "@std/fs";
import { stub } from "@std/testing/mock";
import * as zip from "@zip.js/zip.js";

import { DenoFileReader, DenoZip } from "./denozip_extractor.ts";
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
    "..",
    "../outside.txt",
    "a/../..",
    "a/../../outside.txt",
    "..\\outside.txt",
    "../out-evil/a.txt",
    "/etc/passwd",
    "\\Windows\\win.ini",
    "C:evil.txt",
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

  assertThrows(
    () => DenoZip.resolveSafeEntryPath(dst, "../outside/", true),
    Error,
    "Unsafe zip entry path",
  );
});

Deno.test("DenoZip.resolveSafeEntryPath should accept valid relative, nested, directory, and Windows-separator entries", () => {
  const dst = TestHelper.getNewTempDir();
  const dstRoot = path.resolve(dst);

  assertEquals(DenoZip.resolveSafeEntryPath(dst, ".", true), dstRoot);
  assertEquals(DenoZip.resolveSafeEntryPath(dst, "./", true), dstRoot);
  assertEquals(DenoZip.resolveSafeEntryPath(dst, "dir\\sub\\file.txt", false), path.resolve(dstRoot, "dir/sub/file.txt"));
  assertEquals(DenoZip.resolveSafeEntryPath(dst, "..config/a.txt", false), path.resolve(dstRoot, "..config/a.txt"));
  assertEquals(DenoZip.resolveSafeEntryPath(dst, "a/b/../c.txt", false), path.resolve(dstRoot, "a/c.txt"));
});

Deno.test("DenoZip should throw a localized read error when source archive does not exist", async () => {
  const config = TestHelper.getConfig();
  const extractor = new DenoZip(config);
  const missingZip = path.join(TestHelper.getNewTempDir(), "does-not-exist.zip");

  await assertRejects(
    async () => await extractor.extractImpl(missingZip, TestHelper.getNewTempDir()),
    Error,
  );
});

Deno.test("DenoZip should throw a localized write error when target entry path is blocked by an existing directory", async () => {
  const config = TestHelper.getConfig();
  const extractor = new DenoZip(config);
  const tempDir = TestHelper.getNewTempDir();
  // testdata/extract/test.zip contains file "test/abc.txt"; pre-creating a directory with that name blocks Deno.open
  await Deno.mkdir(path.join(tempDir, "test", "abc.txt"), { recursive: true });

  await assertRejects(
    async () => await extractor.extractImpl("testdata/extract/test.zip", tempDir),
    Error,
  );
});

Deno.test("DenoFileReader should clamp huge read lengths to file size and handle out-of-bounds reads safely", async () => {
  const tempDir = TestHelper.getNewTempDir();
  const sampleFile = path.join(tempDir, "sample.bin");
  await Deno.writeTextFile(sampleFile, "hello-zip");

  const reader = new DenoFileReader(sampleFile);
  try {
    await reader.init();
    // Repeated init must be idempotent and not leak an extra file descriptor
    await reader.init();

    // Unbounded length from a malformed ZIP header must clamp to remaining file bytes without OOM
    const clamped = await reader.readUint8Array(6, 10_000_000_000);
    assertEquals(new TextDecoder().decode(clamped), "zip");

    assertEquals((await reader.readUint8Array(-1, 5)).length, 0);
    assertEquals((await reader.readUint8Array(0, 0)).length, 0);
    assertEquals((await reader.readUint8Array(999, 5)).length, 0);
  } finally {
    reader.close();
  }
});

Deno.test("DenoFileReader rejects read before init, handles short EOF reads, and DenoZip wraps stream write failures", async () => {
  const tempDir = TestHelper.getNewTempDir();
  const sampleFile = path.join(tempDir, "sample.bin");
  await Deno.writeTextFile(sampleFile, "hello");

  // Uninitialized readUint8Array throws
  const uninited = new DenoFileReader(sampleFile);
  await assertRejects(() => uninited.readUint8Array(0, 5), Error, "Zip source file not open");

  // Early EOF (read returns null) returns partial bytes cleanly
  const reader = new DenoFileReader(sampleFile);
  await reader.init();
  const internalFile = (reader as unknown as { file: Deno.FsFile }).file;
  const readStub = stub(internalFile, "read", () => Promise.resolve(null));
  try {
    const partial = await reader.readUint8Array(0, 5);
    assertEquals(partial.length, 0);
  } finally {
    readStub.restore();
    reader.close();
  }

  // Stream write error during entry.getData closes outFile and wraps error
  const outDir = path.join(tempDir, "out");
  const origOpen = Deno.open;
  const openStub = stub(Deno, "open", async (p: string | URL, opts?: Deno.OpenOptions) => {
    if (opts?.write) {
      return {
        writable: new WritableStream({
          write() {
            throw new Error("simulated write failure");
          },
        }),
        close() {},
      } as unknown as Deno.FsFile;
    }
    return await origOpen(p, opts);
  });
  try {
    const extractor = new DenoZip(TestHelper.getConfig());
    await assertRejects(() => extractor.extractImpl("testdata/extract/test.zip", outDir), Error);
  } finally {
    openStub.restore();
  }
});
