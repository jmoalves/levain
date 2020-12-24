import TestHelper from "../../lib/test/test_helper.ts";
import ActionFactory from "../action_factory.ts";
import {assert, assertEquals} from "https://deno.land/std/testing/asserts.ts";
import PropertyGetAction from "./property_get.ts";
import * as path from "https://deno.land/std/path/mod.ts";

Deno.test('PropertyGetAction should be obtainable with action factory', () => {
    const config = TestHelper.getConfig()
    const factory = new ActionFactory()
    const action = factory.get("propertyGet", config)

    assert(action instanceof PropertyGetAction)
})
Deno.test('PropertyGetAction should get value from .properties file', async () => {
    const config = TestHelper.getConfig()
    const action = new PropertyGetAction(config)

    await action.execute(TestHelper.mockPackage(), [
        '--setVar',
        'myVar',
        path.join('testdata', 'properties', 'person.properties'),
        'name',
    ])

    const currentValue = config.getVar('myVar')
    assertEquals(currentValue, 'John Doe')
})
