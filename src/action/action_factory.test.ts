import AssertContainsAction from "./assert_contains_action.ts";
import {assert, assertThrows} from "https://deno.land/std/testing/asserts.ts";
import TestHelper from "../lib/test/test_helper.ts";
import ActionFactory from "./action_factory.ts";
import {assertArrayContainsInAnyOrder} from "../lib/test/more_asserts.ts";

Deno.test('ActionFactory should list actions', () => {
    const factory = getActionFactory()

    const actions: string[] = factory.list()

    assertArrayContainsInAnyOrder(actions, [
        'addPath',
        'assertContains',
        'contextMenu',
        'copy',
        'defaultPackage',
        'extract',
        'inspect',
        'levainShell',
        'mkdir',
        'saveConfig',
        'setEnv',
        'template',
        'checkChainDirExists',
        'echo',
        'removeFromRegistry',
        'setVar',
        'addToStartup',
        'jsonGet',
        'jsonSet',
        'jsonRemove',
        'propertyGet',
        'backupFile',
        'propertySet',
        'checkPort',
        'shellPath',
    ])
})
Deno.test('should know the assertContains action', () => {
    const factory = getActionFactory()
    const config = TestHelper.getConfig()

    const action = factory.get('assertContains', config)

    assert(action instanceof AssertContainsAction)
})
Deno.test('should throw exception when Action does not exist', () => {
    const factory = getActionFactory()
    const config = TestHelper.getConfig()

    assertThrows(
        () => {
            factory.get('thisActionDoesNotExist', config)
        },
        Error,
        'Action thisActionDoesNotExist not found - Aborting...'
    )
})

function getActionFactory(): ActionFactory {
    return new ActionFactory()
}
