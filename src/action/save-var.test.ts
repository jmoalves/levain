import ActionFactory from './action_factory.ts';
import TestHelper from '../lib/test/test_helper.ts';
import {assert, assertEquals, assertThrowsAsync,} from "https://deno.land/std/testing/asserts.ts";
import SaveVarAction from './save-var.ts';

Deno.test('should be obtainable with action factory', () => {
    const config = TestHelper.getConfig()
    const factory = new ActionFactory()
    const action = factory.get("saveVar", config)

    assert(action instanceof SaveVarAction)
})
Deno.test('should save var in config', async () => {
    const config = TestHelper.getConfig()
    const action = new SaveVarAction(config)

    await action.execute(TestHelper.mockPackage(), ['nova.var', 'abc123'])

    assertEquals(config.getVar('nova.var'), 'abc123')
})
Deno.test('should ask for two parameters', async () => {
    const config = TestHelper.getConfig()
    const action = new SaveVarAction(config)

    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), [])
        },
        Error,
        'Action - saveVar - You should inform the var name and value',
    )
})
