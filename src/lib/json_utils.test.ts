import * as log from "https://deno.land/std/log/mod.ts";
import { assertEquals, assertThrowsAsync } from "https://deno.land/std/testing/asserts.ts";

import TestHelper from "../lib/test/test_helper.ts";
import JsonUtils from "./json_utils.ts";

Deno.test('JsonUtils - should load json file', async () => {
    let filename = TestHelper.resolveTestFile('json/test.json');
    let json = JsonUtils.load(filename);

    assertEquals(json.property, "value");
})

Deno.test('JsonUtils - should get simple string property', async () => {
    let json = { "property": "value" }
    assertEquals(JsonUtils.get(json, "property"), "value");
})

Deno.test('JsonUtils - should get default value for simple string property', async () => {
    let json = { "property": "value" }
    assertEquals(JsonUtils.get(json, "notFound", "default"), "default");
})

Deno.test('JsonUtils - should get simple number property', async () => {
    let json = { "property": 150.00 }
    assertEquals(JsonUtils.get(json, "property"), 150.00);
})

Deno.test('JsonUtils - should get default value for simple number property', async () => {
    let json = { "property": 150.00 }
    assertEquals(JsonUtils.get(json, "notFound", 200.00), 200.00);
})

Deno.test('JsonUtils - should get simple boolean property', async () => {
    let json = { "property": true }
    assertEquals(JsonUtils.get(json, "property"), true);
})

Deno.test('JsonUtils - should get default value for simple boolean property', async () => {
    let json = { "property": true }
    assertEquals(JsonUtils.get(json, "notFound", true), true);
})

// Deno.test('JsonUtils - should get an inner property property', async () => {
//     let json = { 
//         property: {
//             innerProperty: "innerValue"
//         } 
//     }

//     assertEquals(JsonUtils.get(json, "[property][innerProperty]"), "innerValue");
// })

// Deno.test('JsonUtils - should get simple string property with []', async () => {
//     let json = { "property": "value" }
//     assertEquals(JsonUtils.get(json, "[property]"), "value");
// })
