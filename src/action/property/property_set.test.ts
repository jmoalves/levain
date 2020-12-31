import TestHelper from "../../lib/test/test_helper.ts";
import ActionFactory from "../action_factory.ts";
import {assert, assertEquals, assertNotEquals} from "https://deno.land/std/testing/asserts.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import PropertySetAction from "./property_set.ts";
import Config from "../../lib/config.ts";
import PropertiesUtils from "./properties_utils.ts";

Deno.test('PropertySet should be obtainable from actionFactory', () => {
    const config = TestHelper.getConfig()
    const factory = new ActionFactory()
    const action = factory.get("propertySet", config)

    assert(action instanceof PropertySetAction)
})
Deno.test('PropertySet should set a property in a file', async () => {
    const originalFile = path.join('testdata', 'properties', 'person.properties')
    const newTempFile = TestHelper.getNewTempFile(originalFile)
    try {
        const expectedAddress = '321 The Other st, Nova Scotia, Canada'
        const oldAddress = PropertiesUtils.get(newTempFile, 'address')
        assertNotEquals(oldAddress, expectedAddress)

        const config = new Config({});
        const action = new PropertySetAction(config)
        await action.execute(TestHelper.mockPackage(), [newTempFile, 'address', expectedAddress] as string[])

        const newAddress = PropertiesUtils.get(newTempFile, 'address')
        assertEquals(newAddress, expectedAddress)
    } finally {
        TestHelper.remove(newTempFile)
    }
})
