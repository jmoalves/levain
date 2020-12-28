import TestHelper from "../../lib/test/test_helper.ts";
import ActionFactory from "../action_factory.ts";
import {assert} from "https://deno.land/std/testing/asserts.ts";
import PropertySetAction from "./property_set.ts";

Deno.test('PropertySet should be obtainable from actionFactory', () => {
    const config = TestHelper.getConfig()
    const factory = new ActionFactory()
    const action = factory.get("propertySet", config)

    assert(action instanceof PropertySetAction)
})
// Deno.test('PropertySet should set a property in a file', () => {
//
// })