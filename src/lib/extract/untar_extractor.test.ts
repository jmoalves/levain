import * as path from "@std/path";
import { assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";

import { UnTar } from "./untar_extractor.ts";
import TestHelper from "../test/test_helper.ts";
import OsUtils from "../os/os_utils.ts";

Deno.test("UnTar.extractImpl should extract a .tar.gz archive with spaces in source and destination paths", async () => {
  const baseDir = TestHelper.getNewTempDir();
  const srcContentDir = path.join(baseDir, "src content");
  const archiveDir = path.join(baseDir, "archive dir");
  const dstDir = path.join(baseDir, "extract dest");
  await Deno.mkdir(path.join(srcContentDir, "nested"), { recursive: true });
  await Deno.mkdir(archiveDir, { recursive: true });
  await Deno.mkdir(dstDir, { recursive: true });
  await Deno.writeTextFile(path.join(srcContentDir, "nested", "hello.txt"), "hello-untar");

  const tarGzPath = path.join(archiveDir, "my archive.tar.gz");
  const tarCmd = await new Deno.Command("tar", {
    args: ["-czf", tarGzPath, "-C", srcContentDir, "nested"],
  }).output();
  assertEquals(tarCmd.success, true, new TextDecoder().decode(tarCmd.stderr));

  const extractor = new UnTar(TestHelper.getConfig());
  await extractor.extractImpl(tarGzPath, dstDir);

  assertEquals(await Deno.readTextFile(path.join(dstDir, "nested", "hello.txt")), "hello-untar");
});

Deno.test("UnTar.extractImpl should fail cleanly via native tar when source archive is missing", async () => {
  const baseDir = TestHelper.getNewTempDir();
  const missingArchive = path.join(baseDir, "missing.tar.gz");
  const dstDir = path.join(baseDir, "out");
  await Deno.mkdir(dstDir, { recursive: true });

  const extractor = new UnTar(TestHelper.getConfig());
  await assertRejects(
    async () => await extractor.extractImpl(missingArchive, dstDir),
    Error,
    "tar extract terminated with code",
  );
});

Deno.test("UnTar.resolveNativeTar should prefer System32 tar.exe on Windows and PATH tar on POSIX", () => {
  const extractor = new UnTar(TestHelper.getConfig());
  const fakeWinRoot = TestHelper.getNewTempDir();
  const fakeSystem32 = path.join(fakeWinRoot, "System32");
  Deno.mkdirSync(fakeSystem32, { recursive: true });
  const fakeTar = path.join(fakeSystem32, "tar.exe");
  Deno.writeTextFileSync(fakeTar, "");

  const isWinStub = stub(OsUtils, "isWindows", () => true);
  const envStub = stub(Deno.env, "get", (key: string) => (key === "SystemRoot" ? fakeWinRoot : undefined));
  try {
    assertEquals(extractor.resolveNativeTar(), fakeTar);
  } finally {
    envStub.restore();
    isWinStub.restore();
  }

  const isPosixStub = stub(OsUtils, "isWindows", () => false);
  const findStub = stub(OsUtils, "findInPath", () => "/usr/bin/tar");
  try {
    assertEquals(extractor.resolveNativeTar(), "/usr/bin/tar");
  } finally {
    findStub.restore();
    isPosixStub.restore();
  }
});

Deno.test("UnTar.extractImpl should fail with a clear error when neither native tar nor 7z fallback is available", async () => {
  const extractor = new UnTar(TestHelper.getConfig());
  const resolveStub = stub(extractor, "resolveNativeTar", () => undefined);
  const isWinStub = stub(OsUtils, "isWindows", () => false);
  try {
    await assertRejects(
      async () => await extractor.extractImpl("archive.tar.gz", TestHelper.getNewTempDir()),
      Error,
      "native 'tar' not found in PATH",
    );
  } finally {
    isWinStub.restore();
    resolveStub.restore();
  }
});

if (OsUtils.isWindows()) {
  Deno.test("UnTar.extractImpl should fall back to 7z.exe on Windows when native tar is absent", async () => {
    const baseDir = TestHelper.getNewTempDir();
    const srcContentDir = path.join(baseDir, "src content");
    const archiveDir = path.join(baseDir, "archive dir");
    const dstDir = path.join(baseDir, "extract dest");
    await Deno.mkdir(path.join(srcContentDir, "nested"), { recursive: true });
    await Deno.mkdir(archiveDir, { recursive: true });
    await Deno.mkdir(dstDir, { recursive: true });
    await Deno.writeTextFile(path.join(srcContentDir, "nested", "hello.txt"), "hello-untar-7z");

    const tarGzPath = path.join(archiveDir, "my archive.tar.gz");
    const tarCmd = await new Deno.Command("tar", {
      args: ["-czf", tarGzPath, "-C", srcContentDir, "nested"],
    }).output();
    assertEquals(tarCmd.success, true, new TextDecoder().decode(tarCmd.stderr));

    const extractor = new UnTar(TestHelper.getConfig());
    const resolveStub = stub(extractor, "resolveNativeTar", () => undefined);
    try {
      await extractor.extractImpl(tarGzPath, dstDir);
    } finally {
      resolveStub.restore();
    }

    assertEquals(await Deno.readTextFile(path.join(dstDir, "nested", "hello.txt")), "hello-untar-7z");
  });

  Deno.test("UnTar 7z fallback should fail cleanly when source archive cannot be decompressed", async () => {
    const baseDir = TestHelper.getNewTempDir();
    const missingArchive = path.join(baseDir, "missing.tar.gz");
    const dstDir = path.join(baseDir, "out");
    await Deno.mkdir(dstDir, { recursive: true });

    const extractor = new UnTar(TestHelper.getConfig());
    const resolveStub = stub(extractor, "resolveNativeTar", () => undefined);
    try {
      await assertRejects(
        async () => await extractor.extractImpl(missingArchive, dstDir),
        Error,
        "7z decompress terminated with code",
      );
    } finally {
      resolveStub.restore();
    }
  });

  Deno.test("UnTar 7z fallback should fail cleanly when tar extraction stage fails", async () => {
    const baseDir = TestHelper.getNewTempDir();
    const srcContentDir = path.join(baseDir, "src");
    await Deno.mkdir(srcContentDir, { recursive: true });
    await Deno.writeTextFile(path.join(srcContentDir, "hello.txt"), "hello-untar");

    const tarGzPath = path.join(baseDir, "valid.tar.gz");
    const tarCmd = await new Deno.Command("tar", {
      args: ["-czf", tarGzPath, "-C", srcContentDir, "hello.txt"],
    }).output();
    assertEquals(tarCmd.success, true, new TextDecoder().decode(tarCmd.stderr));

    // Destination is an existing regular file -> 7z decompress succeeds, 7z tar extract fails
    const blockingFile = path.join(baseDir, "not-a-dir");
    await Deno.writeTextFile(blockingFile, "blocker");

    const extractor = new UnTar(TestHelper.getConfig());
    const resolveStub = stub(extractor, "resolveNativeTar", () => undefined);
    try {
      await assertRejects(
        async () => await extractor.extractImpl(tarGzPath, blockingFile),
        Error,
        "7z tar extract terminated with code",
      );
    } finally {
      resolveStub.restore();
    }
  });
}
