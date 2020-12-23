import ActionFactory from './action_factory.ts';
import TestHelper from '../lib/test/test_helper.ts';
import {assert, assertArrayIncludes, assertEquals, assertStringIncludes, assertThrowsAsync,} from "https://deno.land/std/testing/asserts.ts";
import AddPathAction from "./add_path.ts";

Deno.test('should be obtainable with action factory', () => {
    const config = TestHelper.getConfig()
    const factory = new ActionFactory()
    const action = factory.get("addPath", config)

    assert(action instanceof AddPathAction)
})
Deno.test('should add to path config', async () => {
    const config = TestHelper.getConfig()
    const action = new AddPathAction(config)

    await action.execute(TestHelper.mockPackage(), ['C:\\test_path\\bin'])
    
    assertArrayIncludes(config.context.action.addpath.path, ['C:\\test_path\\bin'])
})
