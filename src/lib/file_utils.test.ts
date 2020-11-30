import {assertEquals} from "https://deno.land/std/testing/asserts.ts";
import {existsSync} from "https://deno.land/std/fs/mod.ts";

//
// isReadOnly
//
import FileUtils from "./file_utils.ts";
import OsUtils from './os_utils.ts';

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

Deno.test('should detect read only folder', () => {
    const fileUri = './testdata/file_utils/read_only_folder'
    verifyFileReadWrite(fileUri, true, false);
})

Deno.test('should detect read only file', () => {
    const fileUri = './testdata/file_utils/read_only.txt'
    verifyFileReadWrite(fileUri, true, false);
})

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
    const fileUri = './testdata/file_utils/--does_not_exist--'
    verifyFileReadWrite(fileUri, false, false);
})
