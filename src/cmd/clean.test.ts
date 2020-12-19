import CommandFactory from "./command_factory.ts";
import TestHelper from "../lib/test/test_helper.ts";
import {assert} from "https://deno.land/std/testing/asserts.ts";
import CleanCommand from "./clean.ts";

Deno.test('CleanCommand should be in command factory', () => {
    const commandFactory = new CommandFactory()
    let config = TestHelper.getConfig();

    const command = commandFactory.get('clean', config)

    assert(command instanceof CleanCommand, 'should be an instance of CleanCommand')
})
Deno.test('CleanCommand should clean cache', () => {
    
})