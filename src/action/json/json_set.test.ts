import { assertEquals, assertThrowsAsync } from "https://deno.land/std/testing/asserts.ts";

import TestHelper from "../../lib/test/test_helper.ts";
import JsonSet from "./json_set.ts";

Deno.test('JsonSet - should throw exception for missing parameters', async () => {
    const action = new JsonSet(TestHelper.getConfig());
    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), []);
        },
        Error,
        'Missing parameters. jsonGet [--ifNotExists] property filename'
    )
})

Deno.test('JsonSet - should throw exception for missing parameters', async () => {
    const action = new JsonSet(TestHelper.getConfig());
    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), ["property"]);
        },
        Error,
        'Missing parameters. jsonGet [--ifNotExists] property filename'
    )
})

Deno.test('JsonSet - should throw exception for missing parameters', async () => {
    const action = new JsonSet(TestHelper.getConfig());
    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), ["--ifNotExists", "filename"]);
        },
        Error,
        'Missing parameters. jsonGet [--ifNotExists] property filename'
    )
})

Deno.test('JsonSet - should throw exception for missing parameters', async () => {
    const action = new JsonSet(TestHelper.getConfig());
    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), ["filename", "--ifNotExists"]);
        },
        Error,
        'Missing parameters. jsonGet [--ifNotExists] property filename'
    )
})

Deno.test('JsonSet - should get simple string property', async () => {
    const config = TestHelper.getConfig();
    const action = new JsonSet(config);
    const varName = "my.var";
    const params = [`--setVar=${varName}`, "property", TestHelper.resolveTestFile('json/test.json')];

    await action.execute(TestHelper.mockPackage(), params);

    assertEquals(config.getVar(varName), "value");
})

Deno.test('JsonSet - should get simple number property', async () => {
    const config = TestHelper.getConfig();
    const action = new JsonSet(config);
    const varName = "my.var";
    const params = [`--setVar=${varName}`, "numberProperty", TestHelper.resolveTestFile('json/test.json')];

    await action.execute(TestHelper.mockPackage(), params);

    assertEquals(config.getVar(varName), 150.00);
})

Deno.test('JsonSet - should get simple boolean property', async () => {
    const config = TestHelper.getConfig();
    const action = new JsonSet(config);
    const varName = "my.var";
    const params = [`--setVar=${varName}`, "booleanProperty", TestHelper.resolveTestFile('json/test.json')];

    await action.execute(TestHelper.mockPackage(), params);

    assertEquals(config.getVar(varName), true);
})

Deno.test('JsonSet - object property must throw exception', async () => {
    const config = TestHelper.getConfig();
    const action = new JsonSet(config);
    const varName = "my.var";
    const params = [`--setVar=${varName}`, "objectProperty", TestHelper.resolveTestFile('json/test.json')];

    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), params);
        },
        Error,
        'Could not retrieve an entire object property - "objectProperty"'
    )
})

Deno.test('JsonSet - array property must throw exception', async () => {
    const config = TestHelper.getConfig();
    const action = new JsonSet(config);
    const varName = "my.var";
    const params = [`--setVar=${varName}`, "arrayProperty", TestHelper.resolveTestFile('json/test.json')];

    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), params);
        },
        Error,
        'Could not retrieve an entire array property - "arrayProperty"'
    )
})

Deno.test('JsonSet - should get an inner string property', async () => {
    const config = TestHelper.getConfig();
    const action = new JsonSet(config);
    const varName = "my.var";
    const params = [`--setVar=${varName}`, "[objectProperty][innerProperty]", TestHelper.resolveTestFile('json/test.json')];

    await action.execute(TestHelper.mockPackage(), params);

    assertEquals(config.getVar(varName), "innerValue");
})

Deno.test('JsonSet - should get simple string property with dots', async () => {
    const config = TestHelper.getConfig();
    const action = new JsonSet(config);
    const varName = "my.var";
    const params = [`--setVar=${varName}`, "property.with.dots", TestHelper.resolveTestFile('json/test.json')];

    await action.execute(TestHelper.mockPackage(), params);

    assertEquals(config.getVar(varName), "dotValue");
})
