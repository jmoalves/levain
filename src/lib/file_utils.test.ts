import {assertEquals, assertThrows,} from "https://deno.land/std/testing/asserts.ts";
import {existsSync} from "https://deno.land/std/fs/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import FileUtils from "./file_utils.ts";
import OsUtils from './os_utils.ts';
import TestHelper from './test/test_helper.ts';

const readOnlyFolder = './testdata/file_utils/read_only_folder';
const folderThatDoesNotExist = './testdata/file_utils/--does_not_exist--';
const readOnlyFile = './testdata/file_utils/read_only.txt';


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
        Deno.chmodSync(readOnlyFolder, 0o000);
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

    assertEquals(fileSize, 615)
})
