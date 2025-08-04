import {assert, assertThrows} from "jsr:@std/assert";

import TestHelper from "../lib/test/test_helper.ts";
import {assertArrayEqualsInAnyOrder} from "../lib/test/more_asserts.ts";

import ActionFactory from "./action_factory.ts";
import AssertContainsAction from "./assert_contains_action.ts";

Deno.test('ActionFactory should list actions', () => {
    const factory = getActionFactory();

    const actions: string[] = factory.list();

    assertArrayEqualsInAnyOrder(actions, [
        'addPath',
        'addToDesktop',
        'addToStartMenu',
        'addToStartup',
        'assertContains',
        'backupFile',
        'checkChainDirExists',
        'checkFileExists',
        'checkPort',
        'checkUrl',
        'clone',
        'contextMenu',
        'copy',
        'defaultPackage',
        'echo',
        'extract',
        'inspect',
        'jsonGet',
        'jsonSet',
        'jsonRemove',
        'killProcess',
        'levainShell',
        'mavenCopy',
        'mkdir',
        'propertyGet',
        'propertySet',
        'removeFromRegistry',
        'saveConfig',
        'setEnv',
        'setVar',
        'shellPath',
        'template',
    ]);
});
Deno.test('ActionFactory should know the assertContains action', () => {
    const factory = getActionFactory();
    const config = TestHelper.getConfig();

    const action = factory.get('assertContains', config);

    assert(action instanceof AssertContainsAction);
});
Deno.test('ActionFactory should throw exception when Action does not exist', () => {
    const factory = getActionFactory();
    const config = TestHelper.getConfig();

    assertThrows(
        () => {
            factory.get('thisActionDoesNotExist', config);
        },
        Error,
        'Action thisActionDoesNotExist not found - Aborting...',
    );
});

function getActionFactory(): ActionFactory {
    return new ActionFactory();
}
