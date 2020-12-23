import {assert, assertEquals, assertNotEquals, assertThrows,} from "https://deno.land/std/testing/asserts.ts";
import {ensureDirSync, existsSync} from "https://deno.land/std/fs/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import FileUtils from "./file_utils.ts";
import OsUtils from './os_utils.ts';
import TestHelper from './test/test_helper.ts';
import {assertNumberEquals} from "./test/more_asserts.ts";

const readOnlyFolder = './testdata/file_utils/read_only_folder';
const folderThatDoesNotExist = './testdata/file_utils/--does_not_exist--';
const readOnlyFile = './testdata/file_utils/read_only.txt';

Deno.test('should create a backup for a given file in the same dir', () => {
    let src = Deno.makeTempFileSync();
    let myData = "some string data";
    Deno.writeTextFileSync(src, myData);
    assert(existsSync(src));

    let bkp1 = FileUtils.createBackup(src);
    let bkp2 = FileUtils.createBackup(src);

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
})

Deno.test('should NOT create a backup for a given file that does NOT exist', () => {
    let src = "/tmp/doesNotExist";
    assert(!existsSync(src));

    let bkp = FileUtils.createBackup(src);

    assert(bkp == undefined);
})

Deno.test('should get file permissions in Windows', () => {
    if (OsUtils.isWindows()) {
        const mode = Deno.statSync(readOnlyFile).mode;
        if (mode) {
            throw `Now we can check file permissions with Deno in Windows (${mode}). Please correct permission verifications in FileUtils`
        }
    }
})
//
// isReadOnly
//
function verifyFileReadWrite(fileUri: string, shouldRead: boolean, shouldWrite: boolean = true) {
    assertEquals(FileUtils.canReadSync(fileUri), shouldRead, 'shouldRead')
    // FIXME Will be able to use the assertion below when Deno.statSync.mode is fully implemented for Windows
    if (!OsUtils.isWindows()) {
        assertEquals(FileUtils.canWriteSync(fileUri), shouldWrite, 'shouldWrite')
    }
}

Deno.test('should detect a RW permission on a folder', () => {
    const fileUri = './testdata/file_utils/'
    verifyFileReadWrite(fileUri, true, true);
})

Deno.test('should detect a RW permission on a file', () => {
    const fileUri = './testdata/file_utils/can_read_and_write_this_file.txt'
    verifyFileReadWrite(fileUri, true, true);
})
if (!OsUtils.isWindows()) {
    Deno.test('should detect read only folder', () => {
        const path = readOnlyFolder
        OsUtils.makeReadOnly(path)
        verifyFileReadWrite(path, true, false);
    })
    Deno.test('should detect read only file', () => {
        const path = readOnlyFile
        OsUtils.makeReadOnly(path)
        verifyFileReadWrite(path, true, false);
    })
}
Deno.test('should detect a folder without permissions', () => {
    // FIXME Will not need the folowing line when Deno.statSync.mode is fully implemented for Windows
    const fileUri = OsUtils.isWindows()
        ? 'd:\\Config.Msi'
        : './testdata/file_utils/cannot_read_this_folder'
    if (!OsUtils.isWindows() && !existsSync(fileUri)) {
        throw `Please create the folder ${fileUri} with read permission denied`
    }
    verifyFileReadWrite(fileUri, false, false);
})
Deno.test('should not read or write a folder that does not exist', () => {
    const fileUri = folderThatDoesNotExist
    verifyFileReadWrite(fileUri, false, false);
})
//
// isDir
//
Deno.test('should detect that a file is not a dir', () => {
    const file = './testdata/file_utils/file.txt'

    const isDir = FileUtils.isDir(file)

    assertEquals(isDir, false)
})
Deno.test('should detect that a dir is a dir', () => {
    const file = './testdata/file_utils'

    const isDir = FileUtils.isDir(file)

    assertEquals(isDir, true)
})
//
// canCreateTempFileInDir
//
Deno.test('canCreateTempFileInDir should be able to write in a temp dir', () => {
    const tempDir = Deno.makeTempDirSync()

    const canWrite = FileUtils.canCreateTempFileInDir(tempDir)

    assertEquals(canWrite, true)
})
if (OsUtils.isWindows()) {
    Deno.test('adjust test when chmodSync is implemented in Windows', () => {
        ensureDirSync(readOnlyFolder)
        assertThrows(
            () => {
                Deno.chmodSync(readOnlyFolder, 0o000);
            },
            Error,
            'Not implemented'
        )
    })
} else {
    Deno.test('canCreateTempFileInDir should not be able to write in a read only dir', () => {
        ensureDirSync(readOnlyFolder)
        Deno.chmodSync(readOnlyFolder, 0o000)

        const canWrite = FileUtils.canCreateTempFileInDir(readOnlyFolder)

        assertEquals(canWrite, false)
    })
}
Deno.test('canCreateTempFileInDir should not be able to write in a dir that does not exist', () => {
    const canWrite = FileUtils.canCreateTempFileInDir(TestHelper.folderThatDoesNotExist)

    assertEquals(canWrite, false)
})
Deno.test('getSize should get file size', () => {
    const filePath = path.join('testdata', 'file_utils', 'file.txt')
    const fileSize = FileUtils.getSize(filePath)

    assertNumberEquals(fileSize, 615, 0.1)
})
Deno.test('throwIfNotExists should throw error when file does not exist', () => {
    const filePath = TestHelper.fileThatDoesNotExist

    assertThrows(
        () => {
            FileUtils.throwIfNotExists(filePath)
        },
        Error,
        `File ${filePath} does not exist`
    )
})
