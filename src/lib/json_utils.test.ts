import {assert, assertEquals, assertThrowsAsync} from "https://deno.land/std/testing/asserts.ts";
import * as path from 'https://deno.land/std/path/mod.ts'
import TestHelper from "../lib/test/test_helper.ts";
import JsonUtils from "./json_utils.ts";

// TODO JsonUtils should save when folder does not exist

Deno.test('JsonUtils - should load json file', async () => {
    let filename = TestHelper.resolveTestFile('json/test.json');
    let json = JsonUtils.load(filename);

    assertEquals(json.property, "value");
})

Deno.test('JsonUtils - should inform that file does not exist', async () => {
    let filename = TestHelper.resolveTestFile('missing_file.json');

    await assertThrowsAsync(
        async () => {
            JsonUtils.load(filename);
        },
        Error,
        `File ${filename} not found`
    )
})
//
// save
//
Deno.test('JsonUtils.save should create folder when it does not exist', async () => {
    const tempdir = Deno.makeTempDirSync();
    let fileInFolderThatDoesNotExist = path.join(
        tempdir,
        'folder-that-does-not-exist',
        'file-that-does-not-exist.json'
    )

    JsonUtils.save(fileInFolderThatDoesNotExist, {attr: 'value'})

    Deno.removeSync(tempdir, {recursive: true})
})
//
//
//
Deno.test('JsonUtils - should get simple string property', async () => {
    let json = {"property": "value"}
    assertEquals(JsonUtils.get(json, "property"), "value");
})

Deno.test('JsonUtils - should get default value for simple string property', async () => {
    let json = {"property": "value"}
    assertEquals(JsonUtils.get(json, "notFound", "default"), "default");
})

Deno.test('JsonUtils - should get simple number property', async () => {
    let json = {"property": 150.00}
    assertEquals(JsonUtils.get(json, "property"), 150.00);
})

Deno.test('JsonUtils - should get default value for simple number property', async () => {
    let json = {"property": 150.00}
    assertEquals(JsonUtils.get(json, "notFound", 200.00), 200.00);
})

Deno.test('JsonUtils - should get simple boolean property', async () => {
    let json = {"property": true}
    assertEquals(JsonUtils.get(json, "property"), true);
})

Deno.test('JsonUtils - should get default value for simple boolean property', async () => {
    let json = {"property": true}
    assertEquals(JsonUtils.get(json, "notFound", true), true);
})

Deno.test('JsonUtils - should get default value for simple boolean property - handle false', async () => {
    let json = {"property": false}
    assertEquals(JsonUtils.get(json, "property", true), false);
    assertEquals(JsonUtils.get(json, "notFound", false), false);
})

Deno.test('JsonUtils - should get simple string property', async () => {
    let json = {"property.with.dots": "value"}
    assertEquals(JsonUtils.get(json, "property.with.dots"), "value");
})

Deno.test('JsonUtils - translate path', async () => {
    assertEquals(JsonUtils.translatePath("property.innerProperty"), ["property.innerProperty"]);
    assertEquals(JsonUtils.translatePath("[property][innerProperty]"), ["property", "innerProperty"]);
    assertEquals(JsonUtils.translatePath("['property']['innerProperty']"), ["property", "innerProperty"]);
    assertEquals(JsonUtils.translatePath('["property"]["innerProperty"]'), ["property", "innerProperty"]);
})

Deno.test('JsonUtils - should get an inner property', async () => {
    let json = {
        property: {
            innerProperty: "innerValue"
        }
    }

    assertEquals(JsonUtils.get(json, "property.innerProperty"), undefined);
    assertEquals(JsonUtils.get(json, "[property][innerProperty]"), "innerValue");
    assertEquals(JsonUtils.get(json, "['property']['innerProperty']"), "innerValue");
    assertEquals(JsonUtils.get(json, '["property"]["innerProperty"]'), "innerValue");
})

Deno.test('JsonUtils - should get simple string property with []', async () => {
    let json = {"property": "value"}
    assertEquals(JsonUtils.get(json, "[property]"), "value");
})

Deno.test('JsonUtils - translate path with array', async () => {
    assertEquals(JsonUtils.translatePath("[property][array][2][name]"), ["property", "array", "2", "name"]);
})

Deno.test('JsonUtils - should get an inner property', async () => {
    let json = {
        property: {
            innerProperty: "innerValue",
            array: [{
                name: "first",
                value: 150.00,
                flag: true
            }, {
                name: "second",
                value: 250.00,
                flag: false
            }]
        }
    }

    assertEquals(JsonUtils.get(json, "[property][innerProperty]"), "innerValue");
    assertEquals(JsonUtils.get(json, "[property][array][0][name]"), "first");
    assertEquals(JsonUtils.get(json, "[property][array][0][value]"), 150.00);
    assertEquals(JsonUtils.get(json, "[property][array][0][flag]"), true);
    assertEquals(JsonUtils.get(json, "[property][array][1][name]"), "second");
    assertEquals(JsonUtils.get(json, "[property][array][1][value]"), 250.00);
    assertEquals(JsonUtils.get(json, "[property][array][1][flag]"), false);
    assertEquals(JsonUtils.get(json, "[property][array][2][flag]"), undefined);
    assertEquals(JsonUtils.get(json, "[property][array][2][name]", "myName"), "myName");
})

Deno.test('JsonUtils - should set simple string property', async () => {
    let json = {"property": "value"};
    JsonUtils.set(json, "property", "newValue");
    assertEquals(json.property, "newValue");
})

Deno.test('JsonUtils - should NOT set simple string property to the same value', async () => {
    let json = {"property": "value"};
    let changed = JsonUtils.set(json, "property", "value");
    assert(!changed);
    assertEquals(json.property, "value");
})

Deno.test('JsonUtils - should set simple number property', async () => {
    let json = {"property": 10.00};
    JsonUtils.set(json, "property", 120.00);
    assertEquals(json.property, 120.00);
})

Deno.test('JsonUtils - should NOT set simple number property to the same value', async () => {
    let json = {"property": 10.00};
    let changed = JsonUtils.set(json, "property", 10.00);
    assert(!changed);
    assertEquals(json.property, 10.00);
})

Deno.test('JsonUtils - should set simple boolean property', async () => {
    let json = {"property": true};
    JsonUtils.set(json, "property", false);
    assertEquals(json.property, false);
})

Deno.test('JsonUtils - should NOT set simple boolean property to the same value', async () => {
    let json = {"property": true};
    let changed = JsonUtils.set(json, "property", true);
    assert(!changed);
    assertEquals(json.property, true);
})

Deno.test('JsonUtils - should NOT set simple string property that exists', async () => {
    let json = {"property": "myValue"};
    JsonUtils.set(json, "property", "otherValue", true);
    assertEquals(json.property, "myValue");
})

Deno.test('JsonUtils - should create simple string property that NOT exists', async () => {
    let json: any = {"property": "myValue"};
    JsonUtils.set(json, "newProperty", "otherValue", true);
    assertEquals(json.property, "myValue");
    assertEquals(json.newProperty, "otherValue");
})

Deno.test('JsonUtils - should set inner string property that NOT exists', async () => {
    let json: any = {
        property: {
            innerProperty: "innerValue",
            array: [{
                name: "first",
                value: 150.00,
                flag: true
            }, {
                name: "second",
                value: 250.00,
                flag: false
            }]
        }
    }

    assert(!JsonUtils.set(json, "[property][innerProperty]", "otherValue", true));
    assert(JsonUtils.set(json, "[property][newProperty]", "newValue", true));

    assertEquals(json.property.innerProperty, "innerValue");
    assertEquals(json.property.newProperty, "newValue");
})

Deno.test('JsonUtils - should set inner properties', async () => {
    let json: any = {
        property: {
            innerProperty: "innerValue",
            array: [{
                name: "first",
                value: 150.00,
                flag: true
            }, {
                name: "second",
                value: 250.00,
                flag: false
            }]
        }
    }

    assert(JsonUtils.set(json, "[property][array][0][name]", "newFirst"));
    assert(JsonUtils.set(json, "[property][array][0][value]", 1150.00));
    assert(JsonUtils.set(json, "[property][array][0][flag]", false));
    assert(JsonUtils.set(json, "[property][array][1][name]", "newSecond"));
    assert(JsonUtils.set(json, "[property][array][1][value]", 1250.00));
    assert(JsonUtils.set(json, "[property][array][1][flag]", true));
    assert(JsonUtils.set(json, "[property][array][2][name]", "newThird"));
    assert(JsonUtils.set(json, "[property][array][2][value]", 1350.00));
    assert(JsonUtils.set(json, "[property][array][2][flag]", true));
    assert(JsonUtils.set(json, "[property][array][:+1:][name]", "newForth"));
    assert(JsonUtils.set(json, "[property][array][:last:][value]", 1450.00));
    assert(JsonUtils.set(json, "[property][array][:last:][flag]", false));

    assert(JsonUtils.set(json, "[property][newArray][0][name]", "newArray"));
    assert(JsonUtils.set(json, "[property][newArray][0][value]", 50.00));
    assert(JsonUtils.set(json, "[property][newArray][0][flag]", false));

    assert(JsonUtils.set(json, "[property][otherArray][:+1:][name]", "otherArray"));
    assert(JsonUtils.set(json, "[property][otherArray][:last:][value]", 50.00));
    assert(JsonUtils.set(json, "[property][otherArray][:last:][flag]", false));

    assert(JsonUtils.set(json, "[property][numberProperty]", "25.00"));
    assert(JsonUtils.set(json, "[property][booleanProperty]", "true"));

    // console.log(`\njson: ${JSON.stringify(json)}`);

    assertEquals(json.property.innerProperty, "innerValue");
    assertEquals(json.property.array[0].name, "newFirst");
    assertEquals(json.property.array[0].value, 1150.00);
    assertEquals(json.property.array[0].flag, false);
    assertEquals(json.property.array[1].name, "newSecond");
    assertEquals(json.property.array[1].value, 1250.00);
    assertEquals(json.property.array[1].flag, true);
    assertEquals(json.property.array[2].name, "newThird");
    assertEquals(json.property.array[2].value, 1350.00);
    assertEquals(json.property.array[2].flag, true);
    assertEquals(json.property.array[3].name, "newForth");
    assertEquals(json.property.array[3].value, 1450.00);
    assertEquals(json.property.array[3].flag, false);

    assert(Array.isArray(json.property.newArray));
    assertEquals(json.property.newArray[0].name, "newArray");
    assertEquals(json.property.newArray[0].value, 50.00);
    assertEquals(json.property.newArray[0].flag, false);

    assert(Array.isArray(json.property.otherArray));
    assertEquals(json.property.otherArray[0].name, "otherArray");
    assertEquals(json.property.otherArray[0].value, 50.00);
    assertEquals(json.property.otherArray[0].flag, false);

    assertEquals(json.property.numberProperty, 25.00);
    assertEquals(json.property.booleanProperty, true);
})
