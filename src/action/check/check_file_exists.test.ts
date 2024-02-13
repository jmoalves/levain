import {assert, assertRejects} from "https://deno.land/std/assert/mod.ts";

import TestHelper from "../../lib/test/test_helper.ts";
import ActionFactory from "../action_factory.ts";
import CheckFileExists from "./check_file_exists.ts";

Deno.test('CheckFileExists should be obtainable from actionFactory', () => {
    const config = TestHelper.getConfig()
    const factory = new ActionFactory()
    const action = factory.get("checkFileExists", config)

    assert(action instanceof CheckFileExists)
})
Deno.test('CheckFileExists should throw error when param list is empty', async () => {
    const action = new CheckFileExists(TestHelper.getConfig())
    const params: string[] = []

    await assertRejects(
        async () => {
            await action.execute(TestHelper.mockPackage(), params)
        },
        Error,
        `Which files should be checked?`
    )
})

Deno.test('CheckFileExists should throw error when one file does not exist', async () => {
    const action = new CheckFileExists(TestHelper.getConfig())
    const params = [TestHelper.fileThatDoesNotExist]

    await assertRejects(
        async () => {
            await action.execute(TestHelper.mockPackage(), params)
        },
        Error,
        `Expected file to exist:\n- ${TestHelper.fileThatDoesNotExist}\n`
    )
})

Deno.test('CheckFileExists should throw error when param list contains only dirs', async () => {
    const action = new CheckFileExists(TestHelper.getConfig())
    const params = [TestHelper.folderThatAlwaysExists, TestHelper.folderThatDoesNotExist]

    await assertRejects(
        async () => {
            await action.execute(TestHelper.mockPackage(), params)
        },
        Error,
        `Expected one of the following files to exist:\n- ${TestHelper.folderThatAlwaysExists}\n- ${TestHelper.folderThatDoesNotExist}\n`
    )
})

Deno.test('CheckFileExists should return when at least one file exists', async () => {
    const action = new CheckFileExists(TestHelper.getConfig())
    const params = [TestHelper.fileThatDoesNotExist, TestHelper.anotherFileThatDoesNotExist, TestHelper.fileThatExists]

    await action.execute(TestHelper.mockPackage(), params)
})
Deno.test('CheckFileExists should return when all files exists', async () => {
    const action = new CheckFileExists(TestHelper.getConfig())
    const params = [TestHelper.fileThatExists, TestHelper.anotherFileThatExists]

    await action.execute(TestHelper.mockPackage(), params)
})

