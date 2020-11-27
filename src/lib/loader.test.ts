import {assert,} from "https://deno.land/std/testing/asserts.ts";
import Loader from "./loader.ts";
import Config from "./config.ts";
import ListCommand from "../cmd/list_command.ts";
import AssertContainsAction from "../action/assert_contains_action.ts";


//
// Commands
//
Deno.test('loadCommand should know the list command', () => {
    const loader = new Loader(new Config([]))

    const command = loader.loadCommandStatic('list')

    assert(command instanceof ListCommand)
})


//
// Actions
//
Deno.test('should know the assertContains action', () => {
    const loader = new Loader(new Config([]))

    const action = loader.loadActionStatic('assertContains')

    assert(action instanceof AssertContainsAction)
})