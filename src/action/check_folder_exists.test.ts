import CheckDirExists from "./check_folder_exists.ts";
import TestHelper from "../lib/test/test_helper.ts";
import OsUtils from "../lib/os_utils.ts";
import {assertThrowsAsync} from "https://deno.land/std/testing/asserts.ts";

const thisFolderDoesNotExist = '--this-folder-does-not-exist--';

Deno.test('should check if folder exists', async () => {
    const action = new CheckDirExists(TestHelper.getConfig())
    const params = [OsUtils.homeDir]

    await action.execute(TestHelper.mockPackage(), params)
})
Deno.test('should throw error if dirs do not exist', async () => {
    const action = new CheckDirExists(TestHelper.getConfig())
    const params = [thisFolderDoesNotExist, '123']

    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), params)
        },
        Error,
        `dirs not found: --this-folder-does-not-exist--, 123`
    )
})
Deno.test('should check if at least one folder exists', async () => {
    const action = new CheckDirExists(TestHelper.getConfig())
    const params = [thisFolderDoesNotExist, OsUtils.homeDir]

    await action.execute(TestHelper.mockPackage(), params)
})