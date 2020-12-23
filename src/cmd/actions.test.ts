import CommandFactory from "./command_factory.ts";
import TestHelper from "../lib/test/test_helper.ts";
import {assert, assertArrayIncludes,} from "https://deno.land/std/testing/asserts.ts";
import ActionsCommand from "./actions.ts";
import TestLogger from "../lib/logger/test_logger.ts";

Deno.test('ActionsCommand should be in command factory', () => {
    const commandFactory = new CommandFactory()
    const config = TestHelper.getConfig();

    const command = commandFactory.get('actions', config)

    assert(command instanceof ActionsCommand, 'should be an instance of ActionsCommand')
})
Deno.test('ActionsCommand should list actions', async () => {
    const logger = await TestLogger.setup()
    const config = TestHelper.getConfig()
    const command = new ActionsCommand(config)

    await command.execute([])

    assertArrayIncludes(
        logger.messages,
        [
            "INFO ",
            "INFO ==================================",
            "INFO actions \"\"",
            "INFO ",
            "INFO = Actions:",
            "INFO   addPath",
            "INFO   addToStartup",
        ]
    )
})
Deno.test('ActionsCommand should list actions that match a search string', async () => {
    const searchString = 'json'
    const logger = await TestLogger.setup()
    const config = TestHelper.getConfig()
    const command = new ActionsCommand(config)

    await command.execute([searchString])

    assertArrayIncludes(
        logger.messages,
        [
            "INFO ",
            "INFO ==================================",
            `INFO actions \"${searchString}\"`,
            "INFO ",
            "INFO = Actions:",
            "INFO   jsonGet",
            "INFO   jsonSet",
            "INFO   jsonRemove",
        ]
    )
})