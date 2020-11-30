import {assertEquals} from "https://deno.land/std/testing/asserts.ts";

//
// isReadOnly
//
import FileUtils from "./file_utils.ts";

Deno.test('should detect a RW permission on a folder', () => {
    const fileUri = './testdata/file_utils/'
    assertEquals(FileUtils.canRead(fileUri), true)
    assertEquals(FileUtils.canWrite(fileUri), true)
})

Deno.test('should detect a RW permission on a file', () => {
    const fileUri = './testdata/file_utils/can_read_and_write_this_file.txt'
    assertEquals(FileUtils.canRead(fileUri), true)
    assertEquals(FileUtils.canWrite(fileUri), true)
})

Deno.test('should detect read only folder', () => {
    const fileUri = './testdata/file_utils/read_only_folder'
    assertEquals(FileUtils.canRead(fileUri), true)
    assertEquals(FileUtils.canWrite(fileUri), false)
})

Deno.test('should detect read only file', () => {
    const fileUri = './testdata/file_utils/read_only.txt'
    assertEquals(FileUtils.canRead(fileUri), true)
    assertEquals(FileUtils.canWrite(fileUri), false)
})

Deno.test('should detect a folder without permissions', () => {
    const fileUri = './testdata/file_utils/cannot_read_this_folder'
    assertEquals(FileUtils.canRead(fileUri), false)
    assertEquals(FileUtils.canWrite(fileUri), false)
})
Deno.test('should not read or write a folder that does not exist', () => {
    const fileUri = './testdata/file_utils/--does_not_exist--'
    assertEquals(FileUtils.canRead(fileUri), false)
    assertEquals(FileUtils.canWrite(fileUri), false)
})
