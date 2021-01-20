import {assert,} from "https://deno.land/std/testing/asserts.ts";

import TestHelper from '../lib/test/test_helper.ts';

import ActionFactory from './action_factory.ts';
import AddToStartupAction from './add_to_startup.ts';

Deno.test('should be obtainable with action factory', () => {
    const config = TestHelper.getConfig()
    const factory = new ActionFactory()
    const action = factory.get("addToStartup", config)

    assert(action instanceof AddToStartupAction)
})
