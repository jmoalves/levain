import * as path from "@std/path";
import { assert, assertEquals, assertNotEquals, assertThrows } from "@std/assert";
import { stub } from "@std/testing/mock";
import { existsSync } from "@std/fs";

import OsUtils from "../os/os_utils.ts";
import TestHelper from "../test/test_helper.ts";
import { assertNumberEquals } from "../test/more_asserts.ts";
import DateUtils from "../utils/date_utils.ts";

import { FileUtils } from "./file_utils.ts";
import t from "../i18n.ts";

const folderThatDoesNotExist = TestHelper.getTestDataPath("file_utils/--does_not_exist--");
const readWriteFolder = TestHelper.getTestDataPath("file_utils/");
const readWriteFile = TestHelper.getTestDataPath("file_utils/can_read_and_write_this_file.txt");

Deno.test("FileUtils - should create a backup for a given file in the same dir", () => {
  const src = Deno.makeTempFileSync();
  const myData = "some string data";
  Deno.writeTextFileSync(src, myData);
  assert(existsSync(src));

  const bkp1 = FileUtils.createBackup(src);
  const bkp2 = FileUtils.createBackup(src);

  assert(bkp1);
  assert(existsSync(bkp1));
  assertEquals(path.dirname(bkp1), path.dirname(src));
  assert(path.basename(bkp1).startsWith(path.basename(src)));

  assert(bkp2);
  assert(existsSync(bkp2));
  assertEquals(path.dirname(bkp2), path.dirname(src));
  assert(path.basename(bkp2).startsWith(path.basename(src)));

  assertNotEquals(bkp1, bkp2);

  Deno.removeSync(src);
  Deno.removeSync(bkp1);
  Deno.removeSync(bkp2);
});

Deno.test("FileUtils - createBackup handles timestamp collision without infinite loop", () => {
  const tempDir = TestHelper.getNewTempDir();
  const src = path.join(tempDir, "config.txt");
  Deno.writeTextFileSync(src, "v1");

  const dateStub = stub(DateUtils, "dateTag", () => "20260101");
  const timeStub = stub(DateUtils, "timeTagWithMillis", () => "120000000");

  try {
    const bkp1 = FileUtils.createBackup(src);
    const bkp2 = FileUtils.createBackup(src);
    const bkp3 = FileUtils.createBackup(src);

    assertEquals(bkp1, `${src}.20260101.120000000.bkp`);
    assertEquals(bkp2, `${src}.20260101.120000000.1.bkp`);
    assertEquals(bkp3, `${src}.20260101.120000000.2.bkp`);
    assert(bkp1 && existsSync(bkp1));
    assert(bkp2 && existsSync(bkp2));
    assert(bkp3 && existsSync(bkp3));
  } finally {
    timeStub.restore();
    dateStub.restore();
  }
});

Deno.test("FileUtils - should NOT create a backup for a given file that does NOT exist", () => {
  const src = "/tmp/doesNotExist";
  assert(!existsSync(src));

  const bkp = FileUtils.createBackup(src);

  assert(bkp == undefined);
});

//
// isReadOnly
//
Deno.test("FileUtils - should detect a RW permission on a folder", () => {
  verifyFileReadWrite(readWriteFolder, true, true);
});
Deno.test("FileUtils - should detect a RW permission on a file", () => {
  verifyFileReadWrite(readWriteFile, true, true);
});
if (!OsUtils.isWindows()) {
  Deno.test("FileUtils - should detect read only folder", () => {
    const tempDir = TestHelper.getNewTempDir();
    try {
      OsUtils.makeReadOnly(tempDir);
      verifyFileReadWrite(tempDir, true, false);
    } finally {
      Deno.chmodSync(tempDir, 0o755);
    }
  });
  Deno.test("FileUtils - should detect read only file", () => {
    const tempFile = TestHelper.getNewTempFile();
    try {
      OsUtils.makeReadOnly(tempFile);
      verifyFileReadWrite(tempFile, true, false);
    } finally {
      Deno.chmodSync(tempFile, 0o644);
    }
  });
} 
if (OsUtils.isWindows()) {
  Deno.test("FileUtils - should detect read only folder on windows", () => {
    const systemDrive = Deno.env.get("SystemDrive") ?? "C:";
    const wpath = `${systemDrive}\\System Volume Information`;
    const canWrite = FileUtils.canCreateTempFileInDir(wpath);
    assertEquals(canWrite, false);
  });
  Deno.test("FileUtils - should detect a folder without permissions", () => {
    const systemDrive = Deno.env.get("SystemDrive") ?? "C:";
    const fileUri = `${systemDrive}\\System Volume Information`;
    verifyFileReadWrite(fileUri, false, false);
  });
}
Deno.test("FileUtils - should not read or write a folder that does not exist", () => {
  verifyFileReadWrite(folderThatDoesNotExist, false, false);
});

function verifyFileReadWrite(fileUri: string, shouldRead: boolean, shouldWrite: boolean = true) {
  assertEquals(FileUtils.canReadSync(fileUri), shouldRead, `should be able to read ${fileUri}`);
  assertEquals(FileUtils.canWriteSync(fileUri), shouldWrite, `should be able to write ${fileUri}`);
}

//
// isDir
//
Deno.test("FileUtils - should detect that a file is not a dir", () => {
  const file = TestHelper.getTestDataPath("file_utils/file.txt");

  const isDir = FileUtils.isDir(file);

  assertEquals(isDir, false);
});
Deno.test("FileUtils - should detect that a dir is a dir", () => {
  const file = TestHelper.getTestDataPath("file_utils");

  const isDir = FileUtils.isDir(file);

  assertEquals(isDir, true);
});
//
// canCreateTempFileInDir
//
Deno.test("FileUtils - canCreateTempFileInDir should be able to write in a temp dir", () => {
  const tempDir = TestHelper.getNewTempDir();

  const canWrite = FileUtils.canCreateTempFileInDir(tempDir);

  assertEquals(canWrite, true);
});
if (!OsUtils.isWindows()) {
  Deno.test("FileUtils - canCreateTempFileInDir should not be able to write in a read only dir", () => {
    // Deno.chmod does not make a folder read-only on Windows.
    // Thus, this test does not work on windows
    const tempDir = TestHelper.getNewTempDir();
    try {
      Deno.chmodSync(tempDir, 0o000);
      const canWrite = FileUtils.canCreateTempFileInDir(tempDir);
      assertEquals(canWrite, false);
    } finally {
      Deno.chmodSync(tempDir, 0o755);
    }
  });
}
Deno.test("FileUtils - canCreateTempFileInDir should not be able to write in a dir that does not exist", () => {
  const canWrite = FileUtils.canCreateTempFileInDir(TestHelper.folderThatDoesNotExist);

  assertEquals(canWrite, false);
});
Deno.test("FileUtils - getSize should get file size", () => {
  const filePath = TestHelper.getTestDataPath("file_utils/file.txt");
  const fileSize = FileUtils.getSize(filePath);

  assertNumberEquals(fileSize, 615, 0.1);
});
Deno.test("FileUtils - throwIfNotExists should throw error when file does not exist", () => {
  const filePath = TestHelper.fileThatDoesNotExist;

  assertThrows(
    () => {
      FileUtils.throwIfNotExists(filePath);
    },
    Error,
    t("lib.fs.file_utils.throwIfNotExistsError", { filePath })
  );
});

Deno.test("FileUtils - isFileSystemUrl", () => {
  assert(!FileUtils.isFileSystemUrl("http://www.test.com/file.zip"));
  assert(!FileUtils.isFileSystemUrl("https://www.test.com/file.zip"));
  assert(!FileUtils.isFileSystemUrl("git@github.com:jmoalves/levain.git"));
  assert(FileUtils.isFileSystemUrl("src\\lib\\fs\\file_utils.test.ts"));
  assert(FileUtils.isFileSystemUrl("src/lib/fs/file_utils.test.ts"));
});

Deno.test("FileUtils.writeTextFileAtomicSync should write/replace atomically without leaving temp files behind", () => {
  const dir = TestHelper.getNewTempDir();
  const target = path.join(dir, "nested", "config.json");

  FileUtils.writeTextFileAtomicSync(target, '{"v":1}');
  assertEquals(Deno.readTextFileSync(target), '{"v":1}');

  FileUtils.writeTextFileAtomicSync(target, '{"v":2}');
  assertEquals(Deno.readTextFileSync(target), '{"v":2}');

  const entries = [...Deno.readDirSync(path.dirname(target))].map((e) => e.name);
  assertEquals(entries, ["config.json"]);

  // Replacing a directory path fails cleanly and removes its temporary file
  const dirTarget = path.join(dir, "existing-dir");
  Deno.mkdirSync(dirTarget);
  assertThrows(() => FileUtils.writeTextFileAtomicSync(dirTarget, "fail"));
  const rootEntries = [...Deno.readDirSync(dir)].map((e) => e.name);
  assert(!rootEntries.some((name) => name.endsWith(".tmp")));

  // Transient PermissionDenied during renameSync retries and succeeds
  const retryTarget = path.join(dir, "retry.json");
  const origRename = Deno.renameSync;
  let attempts = 0;
  const renameStub = stub(Deno, "renameSync", (oldPath: string | URL, newPath: string | URL) => {
    attempts++;
    if (attempts === 1) {
      throw new Deno.errors.PermissionDenied("transient Windows lock");
    }
    return origRename(oldPath, newPath);
  });
  try {
    FileUtils.writeTextFileAtomicSync(retryTarget, '{"retried":true}');
    assertEquals(attempts, 2);
    assertEquals(Deno.readTextFileSync(retryTarget), '{"retried":true}');
  } finally {
    renameStub.restore();
  }
});
