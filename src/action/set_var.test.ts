import {assert, assertEquals, assertThrowsAsync,} from "https://deno.land/std/testing/asserts.ts";

import TestHelper from '../lib/test/test_helper.ts';

import ActionFactory from './action_factory.ts';
import SetVarAction from './set_var.ts';

Deno.test('SetVarAction should be obtainable with action factory', () => {
    const config = TestHelper.getConfig()
    const factory = new ActionFactory()
    const action = factory.get("setVar", config)

    assert(action instanceof SetVarAction)
})
Deno.test('SetVarAction should set var in config', async () => {
    const config = TestHelper.getConfig()
    const action = new SetVarAction(config)

    await action.execute(TestHelper.mockPackage(), ['nova.var', 'abc123'])

    assertEquals(config.getVar('nova.var'), 'abc123')
})
Deno.test('SetVarAction should ask for two parameters', async () => {
    const config = TestHelper.getConfig()
    const action = new SetVarAction(config)

    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), [])
        },
        Error,
        'Action - setVar - You should inform the var name and value',
    )
})
