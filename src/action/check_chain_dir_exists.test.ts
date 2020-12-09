import CheckChainDirExists from "./check_chain_dir_exists.ts";
import TestHelper from "../lib/test/test_helper.ts";
import OsUtils from "../lib/os_utils.ts";
import {assertEquals, assertThrowsAsync} from "https://deno.land/std/testing/asserts.ts";

const thisFolderDoesNotExist = 'this-folder-does-not-exist';

Deno.test('should check if folder exists', async () => {
    const action = new CheckChainDirExists(TestHelper.getConfig())
    const params = [OsUtils.homeDir]

    await action.execute(TestHelper.mockPackage(), params)
})
Deno.test('should throw error if dirs do not exist', async () => {
    const action = new CheckChainDirExists(TestHelper.getConfig())
    const params = [thisFolderDoesNotExist, '123']

    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), params)
        },
        Error,
        `dirs not found: this-folder-does-not-exist, 123`
    )
})
Deno.test('should check if at least one folder exists', async () => {
    const action = new CheckChainDirExists(TestHelper.getConfig())
    const params = [thisFolderDoesNotExist, OsUtils.homeDir]

    await action.execute(TestHelper.mockPackage(), params)
})
Deno.test('should save first found in saveVar', async () => {
    const config = TestHelper.getConfig();
    const action = new CheckChainDirExists(config)
    const params = ['--saveVar=foundFolder', thisFolderDoesNotExist, OsUtils.homeDir]

    await action.execute(TestHelper.mockPackage(), params)

    // const envFoundFolder = Deno.env.get('foundFolder')
    // assertEquals(envFoundFolder, OsUtils.homeDir)
    const foundFolder = config.getVar('foundFolder')
    assertEquals(foundFolder, OsUtils.homeDir)
    const actionFoundFolder = config.context?.action?.checkFolderExists?.env['foundFolder']
    assertEquals(actionFoundFolder, OsUtils.homeDir)
})
