import {assertEquals} from "https://deno.land/std/testing/asserts.ts";

//
// isReadOnly
//
import FileUtils from "./file_utils.ts";

function verifyFileReadWrite(fileUri: string, shouldRead: boolean, shouldWrite: boolean = true) {
    assertEquals(FileUtils.canRead(fileUri), shouldRead, 'shouldRead')
    assertEquals(FileUtils.canWrite(fileUri), shouldWrite, 'shouldWrite')
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
    const fileUri = './testdata/file_utils/cannot_read_this_folder'
    verifyFileReadWrite(fileUri, false, false);
})

Deno.test('should not read or write a folder that does not exist', () => {
    const fileUri = './testdata/file_utils/--does_not_exist--'
    verifyFileReadWrite(fileUri, false, false);
})
