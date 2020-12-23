import CommandFactory from "./command_factory.ts";
import TestHelper from "../lib/test/test_helper.ts";
import {assert} from "https://deno.land/std/testing/asserts.ts";
import ActionsCommand from "./actions.ts";

Deno.test('ActionsCommand should be in command factory', () => {
    const commandFactory = new CommandFactory()
    const config = TestHelper.getConfig();

    const command = commandFactory.get('actions', config)

    assert(command instanceof ActionsCommand, 'should be an instance of ActionsCommand')
})
// Deno.test('ActionsCommand should list actions', () => {
//
// })