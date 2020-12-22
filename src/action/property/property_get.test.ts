import TestHelper from "../../lib/test/test_helper.ts";
import ActionFactory from "../action_factory.ts";
import {assert,} from "https://deno.land/std/testing/asserts.ts";
import PropertyGetAction from "./property_get.ts";

Deno.test('PropertyGetAction should be obtainable with action factory', () => {
    const config = TestHelper.getConfig()
    const factory = new ActionFactory()
    const action = factory.get("propertyGet", config)

    assert(action instanceof PropertyGetAction)
})