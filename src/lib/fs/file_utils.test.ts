import * as path from "@std/path";
import { assert, assertEquals, assertNotEquals, assertThrows } from "@std/assert";
import { ensureDirSync, ensureFileSync, existsSync } from "@std/fs";

import OsUtils from "../os/os_utils.ts";
import TestHelper from "../test/test_helper.ts";
import { assertNumberEquals } from "../test/more_asserts.ts";

import { FileUtils } from "./file_utils.ts";
import t from "../i18n.ts";

const readOnlyFolder = TestHelper.getTestDataPath("file_utils/read_only_folder");
const folderThatDoesNotExist = TestHelper.getTestDataPath("file_utils/--does_not_exist--");
const readOnlyFile = TestHelper.getTestDataPath("file_utils/read_only.txt");
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
    const path = readOnlyFolder;
    ensureDirSync(readOnlyFolder);
    OsUtils.makeReadOnly(path);
    verifyFileReadWrite(path, true, false);
  });
  Deno.test("FileUtils - should detect read only file", () => {
    const path = readOnlyFile;
    ensureFileSync(readOnlyFile);
    OsUtils.makeReadOnly(path);
    verifyFileReadWrite(path, true, false);
  });
} 
if (OsUtils.isWindows()) {
  Deno.test("FileUtils - should detect read only folder on windows", () => {
    const wpath = Deno.env.get("WINDIR") ?? Deno.env.get("SystemRoot") ?? "C:\\Windows";
    ensureDirSync(wpath);
    const canWrite = FileUtils.canCreateTempFileInDir(wpath);
    assertEquals(canWrite, false);
  });
  Deno.test("FileUtils - should detect a folder without permissions", () => {
    // FIXME Will not need the folowing line when Deno.statSync.mode is fully implemented for Windows
    const fileUri = "d:\\Config.Msi";
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
    ensureDirSync(readOnlyFolder);
    Deno.chmodSync(readOnlyFolder, 0o000);

    const canWrite = FileUtils.canCreateTempFileInDir(readOnlyFolder);

    assertEquals(canWrite, false);
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
