import {assert, assertThrows} from "https://deno.land/std/testing/asserts.ts";

import TestHelper from "../lib/test/test_helper.ts";
import {assertArrayEqualsInAnyOrder} from "../lib/test/more_asserts.ts";

import ListCommand from "./list_command.ts";
import CommandFactory from "./command_factory.ts";

Deno.test('CommandFactory should list commands', () => {
    const factory = getCommandFactory()

    const actions: string[] = factory.list()

    assertArrayEqualsInAnyOrder(actions, [
        'install',
        'shell',
        'list',
        'clean',
        'actions',
        'info',
        'explain',
        'prepare',
    ])
})
Deno.test('CommandFactory should know the list command', () => {
    const factory = getCommandFactory()
    const config = TestHelper.getConfig()

    const command = factory.get('list', config)

    assert(command instanceof ListCommand)
})
Deno.test('CommandFactory should throw exception when command was not found', () => {
    const factory = getCommandFactory()
    const config = TestHelper.getConfig()

    assertThrows(
        () => {
            factory.get('thisCommandDoesNotExist', config)
        },
        Error,
        'Command thisCommandDoesNotExist not found - Aborting...'
    )
})

function getCommandFactory(): CommandFactory {
    return new CommandFactory()
}
