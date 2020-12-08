import AssertContainsAction from "./assert_contains_action.ts";
import {assert, assertThrows} from "https://deno.land/std/testing/asserts.ts";
import TestHelper from "../lib/test/test_helper.ts";
import ActionFactory from "./action_factory.ts";

Deno.test('should know the assertContains action', () => {
    const actionFactory = getActionFactory()
    const config = TestHelper.getConfig();

    const action = actionFactory.get('assertContains', config)

    assert(action instanceof AssertContainsAction)
})
Deno.test('should throw exception when Action does not exist', () => {
    const actionFactory = getActionFactory()
    const config = TestHelper.getConfig();

    assertThrows(
        () => {
            actionFactory.get('thisActionDoesNotExist', config)
        },
        Error,
        'Action thisActionDoesNotExist not found - Aborting...'
    )
})
// Deno.test('should list actions', () => {
//
// })

function getActionFactory() {
    return new ActionFactory()
}