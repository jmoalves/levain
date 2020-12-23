import { assertEquals, assertThrowsAsync } from "https://deno.land/std/testing/asserts.ts";

import TestHelper from "../../lib/test/test_helper.ts";
import JsonGet from "./json_get.ts";

Deno.test('JsonGet - should throw exception for missing parameters', async () => {
    const action = new JsonGet(TestHelper.getConfig());
    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), []);
        },
        Error,
        'Missing parameters. jsonGet --setVar=VAR filename property'
    )
})

Deno.test('JsonGet - should throw exception for missing parameters', async () => {
    const action = new JsonGet(TestHelper.getConfig());
    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), ["property"]);
        },
        Error,
        'Missing parameters. jsonGet --setVar=VAR filename property'
    )
})

Deno.test('JsonGet - should throw exception for missing parameters', async () => {
    const action = new JsonGet(TestHelper.getConfig());
    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), ["filename", "property"]);
        },
        Error,
        'Missing parameters. jsonGet --setVar=VAR filename property'
    )
})

Deno.test('JsonGet - should throw exception for missing parameters', async () => {
    const action = new JsonGet(TestHelper.getConfig());
    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), ["--setVar", "filename"]);
        },
        Error,
        'Missing parameters. jsonGet --setVar=VAR filename property'
    )
})

Deno.test('JsonGet - should throw exception for missing parameters', async () => {
    const action = new JsonGet(TestHelper.getConfig());
    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), ["--setVar=var", "filename"]);
        },
        Error,
        'Missing parameters. jsonGet --setVar=VAR filename property'
    )
})

Deno.test('JsonGet - should get simple string property', async () => {
    const config = TestHelper.getConfig();
    const action = new JsonGet(config);
    const varName = "my.var";
    const params = [`--setVar=${varName}`, TestHelper.resolveTestFile('json/test.json'), "property"];

    await action.execute(TestHelper.mockPackage(), params);

    assertEquals(config.getVar(varName), "value");
})

Deno.test('JsonGet - should get simple number property', async () => {
    const config = TestHelper.getConfig();
    const action = new JsonGet(config);
    const varName = "my.var";
    const params = [`--setVar=${varName}`, TestHelper.resolveTestFile('json/test.json'), "numberProperty"];

    await action.execute(TestHelper.mockPackage(), params);

    assertEquals(config.getVar(varName), 150.00);
})

Deno.test('JsonGet - should get simple boolean property', async () => {
    const config = TestHelper.getConfig();
    const action = new JsonGet(config);
    const varName = "my.var";
    const params = [`--setVar=${varName}`, TestHelper.resolveTestFile('json/test.json'), "booleanProperty"];

    await action.execute(TestHelper.mockPackage(), params);

    assertEquals(config.getVar(varName), true);
})

Deno.test('JsonGet - object property must throw exception', async () => {
    const config = TestHelper.getConfig();
    const action = new JsonGet(config);
    const varName = "my.var";
    const params = [`--setVar=${varName}`, TestHelper.resolveTestFile('json/test.json'), "objectProperty"];

    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), params);
        },
        Error,
        'Could not retrieve an entire object property - "objectProperty"'
    )
})

Deno.test('JsonGet - array property must throw exception', async () => {
    const config = TestHelper.getConfig();
    const action = new JsonGet(config);
    const varName = "my.var";
    const params = [`--setVar=${varName}`, TestHelper.resolveTestFile('json/test.json'), "arrayProperty"];

    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), params);
        },
        Error,
        'Could not retrieve an entire array property - "arrayProperty"'
    )
})

Deno.test('JsonGet - should get an inner string property', async () => {
    const config = TestHelper.getConfig();
    const action = new JsonGet(config);
    const varName = "my.var";
    const params = [`--setVar=${varName}`, TestHelper.resolveTestFile('json/test.json'), "[objectProperty][innerProperty]"];

    await action.execute(TestHelper.mockPackage(), params);

    assertEquals(config.getVar(varName), "innerValue");
})

Deno.test('JsonGet - should get simple string property with dots', async () => {
    const config = TestHelper.getConfig();
    const action = new JsonGet(config);
    const varName = "my.var";
    const params = [`--setVar=${varName}`, TestHelper.resolveTestFile('json/test.json'), "property.with.dots"];

    await action.execute(TestHelper.mockPackage(), params);

    assertEquals(config.getVar(varName), "dotValue");
})
