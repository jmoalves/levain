import * as path from "@std/path";
import { assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";

import { UnTar } from "./untar_extractor.ts";
import TestHelper from "../test/test_helper.ts";
import OsUtils from "../os/os_utils.ts";
import ExtraBin from "../paths/extra_bin.ts";

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

Deno.test("UnTar.extractImpl should dispatch to extractWithSevenZip on Windows when native tar is absent and 7z.exe exists", async () => {
  const fakeSevenZipDir = TestHelper.getNewTempDir();
  const fakeSevenZipExe = path.join(fakeSevenZipDir, "7z.exe");
  await Deno.writeTextFile(fakeSevenZipExe, "");

  const extractor = new UnTar(TestHelper.getConfig());
  const resolveStub = stub(extractor, "resolveNativeTar", () => undefined);
  const isWinStub = stub(OsUtils, "isWindows", () => true);
  const sevenZipDirProp = Object.getOwnPropertyDescriptor(ExtraBin, "sevenZipDir");
  Object.defineProperty(ExtraBin, "sevenZipDir", { get: () => fakeSevenZipDir, configurable: true });
  const sevenZipCalls: string[][] = [];
  const sevenZipStub = stub(extractor, "extractWithSevenZip", (exe: string, src: string, dst: string) => {
    sevenZipCalls.push([exe, src, dst]);
    return Promise.resolve();
  });

  try {
    await extractor.extractImpl("archive.tar.gz", "/out");
    assertEquals(sevenZipCalls, [[fakeSevenZipExe, "archive.tar.gz", "/out"]]);
  } finally {
    sevenZipStub.restore();
    if (sevenZipDirProp) Object.defineProperty(ExtraBin, "sevenZipDir", sevenZipDirProp);
    isWinStub.restore();
    resolveStub.restore();
  }
});

Deno.test("UnTar.extractWithSevenZip pipes streams and handles spawn, decompress, extract, and pipe errors", async () => {
  const extractor = new UnTar(TestHelper.getConfig());
  const encoder = new TextEncoder();

  function makeStream(text: string): ReadableStream<Uint8Array<ArrayBuffer>> {
    return new ReadableStream({
      start(controller) {
        if (text) controller.enqueue(encoder.encode(text));
        controller.close();
      },
    });
  }

  function makeSink(failOnWrite = false): { stream: WritableStream<Uint8Array>; chunks: Uint8Array[] } {
    const chunks: Uint8Array[] = [];
    const stream = new WritableStream<Uint8Array>({
      write(chunk) {
        if (failOnWrite) throw new Error("broken pipe");
        chunks.push(chunk);
      },
    });
    return { stream, chunks };
  }

  const OrigCommand = Deno.Command;
  try {
    // 1. Success pipeline
    let callIdx = 0;
    const sink1 = makeSink();
    (Deno as { Command: unknown }).Command = class FakeCommand {
      spawn() {
        callIdx++;
        if (callIdx === 1) {
          return {
            stdout: makeStream("tar-bytes"),
            stderr: makeStream(""),
            status: Promise.resolve({ success: true, code: 0 }),
          };
        }
        return {
          stdin: sink1.stream,
          stderr: makeStream(""),
          status: Promise.resolve({ success: true, code: 0 }),
        };
      }
    };
    await extractor.extractWithSevenZip("7z.exe", "a.tar.gz", "dst");
    assertEquals(new TextDecoder().decode(sink1.chunks[0]), "tar-bytes");

    // 2. Second spawn throws -> cleans up decompress process and rethrows
    callIdx = 0;
    let killed = false;
    (Deno as { Command: unknown }).Command = class FakeCommand {
      spawn() {
        callIdx++;
        if (callIdx === 1) {
          return {
            stdout: makeStream("tar-bytes"),
            stderr: makeStream(""),
            kill() {
              killed = true;
            },
            status: Promise.resolve({ success: false, code: 1 }),
          };
        }
        throw new Error("second spawn failed");
      }
    };
    await assertRejects(
      () => extractor.extractWithSevenZip("7z.exe", "a.tar.gz", "dst"),
      Error,
      "second spawn failed",
    );
    assertEquals(killed, true);

    // 3. Decompress exits non-zero
    callIdx = 0;
    const sink3 = makeSink();
    (Deno as { Command: unknown }).Command = class FakeCommand {
      spawn() {
        callIdx++;
        if (callIdx === 1) {
          return {
            stdout: makeStream(""),
            stderr: makeStream("corrupt gzip"),
            status: Promise.resolve({ success: false, code: 2 }),
          };
        }
        return {
          stdin: sink3.stream,
          stderr: makeStream(""),
          status: Promise.resolve({ success: true, code: 0 }),
        };
      }
    };
    await assertRejects(
      () => extractor.extractWithSevenZip("7z.exe", "a.tar.gz", "dst"),
      Error,
      "7z decompress terminated with code 2: corrupt gzip",
    );

    // 4. Tar extract exits non-zero
    callIdx = 0;
    const sink4 = makeSink();
    (Deno as { Command: unknown }).Command = class FakeCommand {
      spawn() {
        callIdx++;
        if (callIdx === 1) {
          return {
            stdout: makeStream("tar-bytes"),
            stderr: makeStream(""),
            status: Promise.resolve({ success: true, code: 0 }),
          };
        }
        return {
          stdin: sink4.stream,
          stderr: makeStream("disk full"),
          status: Promise.resolve({ success: false, code: 1 }),
        };
      }
    };
    await assertRejects(
      () => extractor.extractWithSevenZip("7z.exe", "a.tar.gz", "dst"),
      Error,
      "7z tar extract terminated with code 1: disk full",
    );

    // 5. Pipe error while both exit 0
    callIdx = 0;
    const sink5 = makeSink(true);
    (Deno as { Command: unknown }).Command = class FakeCommand {
      spawn() {
        callIdx++;
        if (callIdx === 1) {
          return {
            stdout: makeStream("tar-bytes"),
            stderr: makeStream(""),
            status: Promise.resolve({ success: true, code: 0 }),
          };
        }
        return {
          stdin: sink5.stream,
          stderr: makeStream(""),
          status: Promise.resolve({ success: true, code: 0 }),
        };
      }
    };
    await assertRejects(
      () => extractor.extractWithSevenZip("7z.exe", "a.tar.gz", "dst"),
      Error,
      "broken pipe",
    );
  } finally {
    (Deno as { Command: unknown }).Command = OrigCommand;
  }
});
