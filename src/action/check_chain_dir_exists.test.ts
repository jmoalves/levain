import {assertEquals, assertThrowsAsync} from "https://deno.land/std/testing/asserts.ts";

import TestHelper from "../lib/test/test_helper.ts";

import CheckChainDirExists from "./check_chain_dir_exists.ts";

Deno.test('should check if folder exists', async () => {
    const action = new CheckChainDirExists(TestHelper.getConfig())
    const params = [TestHelper.folderThatAlwaysExists]

    await action.execute(TestHelper.mockPackage(), params)
})
Deno.test('should throw error if dirs do not exist', async () => {
    const action = new CheckChainDirExists(TestHelper.getConfig())
    const params = [TestHelper.folderThatDoesNotExist, '123']

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
    const params = [TestHelper.folderThatDoesNotExist, TestHelper.folderThatAlwaysExists]

    await action.execute(TestHelper.mockPackage(), params)
})
Deno.test('should save first found in saveVar', async () => {
    const config = TestHelper.getConfig();
    const action = new CheckChainDirExists(config)
    const params = ['--saveVar=foundFolder', TestHelper.folderThatDoesNotExist, TestHelper.folderThatAlwaysExists]

    await action.execute(TestHelper.mockPackage(), params)

    const foundFolder = config.getVar('foundFolder')
    assertEquals(foundFolder, TestHelper.folderThatAlwaysExists)
})
Deno.test('should accept a default value', async () => {
    const config = TestHelper.getConfig();
    const action = new CheckChainDirExists(config)
    const defaultValue = 'defaultFolder'
    const params = [
        '--saveVar=foundFolder',
        `--default=${defaultValue}`,
        TestHelper.folderThatDoesNotExist,
        TestHelper.anotherFolderThatDoesNotExist,
    ]

    await action.execute(TestHelper.mockPackage(), params)

    const foundFolder = config.getVar('foundFolder')
    assertEquals(foundFolder, defaultValue)
})
Deno.test('should find dir even with a default value', async () => {
    const config = TestHelper.getConfig();
    const action = new CheckChainDirExists(config)
    const defaultValue = 'defaultFolder'
    const params = [
        '--saveVar=foundFolder',
        `--default=${defaultValue}`,
        TestHelper.folderThatDoesNotExist,
        TestHelper.folderThatAlwaysExists,
        TestHelper.anotherFolderThatDoesNotExist,
    ]

    await action.execute(TestHelper.mockPackage(), params)

    const foundFolder = config.getVar('foundFolder')

    assertEquals(foundFolder, TestHelper.folderThatAlwaysExists)
})
