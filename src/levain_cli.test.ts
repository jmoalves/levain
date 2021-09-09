import {assertArrayIncludes,} from "https://deno.land/std/testing/asserts.ts";

import TestHelper from "./lib/test/test_helper.ts";

import LevainCli from './levain_cli.ts';

Deno.test('LevainCli should be able to list packages', async () => {
    const logger = await TestHelper.setupTestLogger()
    const levainCli = new LevainCli()
    const myArgs = {
        _: ['list']
    }

    await levainCli.execute(myArgs)
})
Deno.test('LevainCli should list commands available', async () => {
    const logger = await TestHelper.setupTestLogger()
    const levainCli = new LevainCli()

    levainCli.showCliHelp()

    assertArrayIncludes(
        logger.messages,
        commandHelp
    )
})
Deno.test('LevainCli should list commands available when invalid command', async () => {
    const logger = await TestHelper.setupTestLogger()
    const levainCli = new LevainCli()

    await levainCli.execute({_: ["commandNotFound"]})

    assertArrayIncludes(
        logger.messages,
        commandHelp
    )
})
const commandHelp = [
    "INFO ",
    "INFO Commands available:",
    "INFO   actions <optional search text>",
    "INFO   clean --cache(optional) --backup(optional) --temp(optional) --logs(optional)",
    "INFO   install <package name>",
    "INFO   list <optional search text>",
    "INFO   shell <optional package name>",
];
