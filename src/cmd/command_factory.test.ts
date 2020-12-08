import ListCommand from "./list_command.ts";
import CommandFactory from "./command_factory.ts";
import TestHelper from "../lib/test/test_helper.ts";
import {assert, assertThrows} from "https://deno.land/std/testing/asserts.ts";

Deno.test('loadCommand should know the list command', () => {
    const factory = getCommandFactory()
    const config = TestHelper.getConfig()

    const command = factory.get('list', config)

    assert(command instanceof ListCommand)
})
Deno.test('should throw exception when command was not found', () => {
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
// Deno.test('should list actions', () => {
//     const factory = getCommandFactory()
//     const config = TestHelper.getConfig()
//
//     const actions: string[] = factory.list()
//
//     assertArrayContainsInAnyOrder(actions, [
//         'install',
//         'shell',
//         'list',
//     ])
// })

function getCommandFactory(): CommandFactory {
    return new CommandFactory()
}