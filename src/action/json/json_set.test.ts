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
        'Missing parameters. jsonSet [--ifNotExists] property value filename'
    )
})

Deno.test('JsonSet - should throw exception for missing parameters', async () => {
    const action = new JsonSet(TestHelper.getConfig());
    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), ["property"]);
        },
        Error,
        'Missing parameters. jsonSet [--ifNotExists] property value filename'
    )
})

Deno.test('JsonSet - should throw exception for missing parameters', async () => {
    const action = new JsonSet(TestHelper.getConfig());
    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), ["--ifNotExists", "filename"]);
        },
        Error,
        'Missing parameters. jsonSet [--ifNotExists] property value filename'
    )
})

Deno.test('JsonSet - should throw exception for missing parameters', async () => {
    const action = new JsonSet(TestHelper.getConfig());
    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), ["filename", "--ifNotExists"]);
        },
        Error,
        'Missing parameters. jsonSet [--ifNotExists] property value filename'
    )
})


Deno.test('JsonSet - should throw exception for missing parameters', async () => {
    const action = new JsonSet(TestHelper.getConfig());
    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), ["property", "value", "--ifNotExists"]);
        },
        Error,
        'Missing parameters. jsonSet [--ifNotExists] property value filename'
    )
})

Deno.test('JsonSet - should set simple string property', async () => {
    let tempfile = Deno.makeTempFileSync();
    Deno.copyFileSync(TestHelper.resolveTestFile('json/test.json'), tempfile);

    const config = TestHelper.getConfig();
    const action = new JsonSet(config);
    const params = ["property", "newValue", tempfile];

    await action.execute(TestHelper.mockPackage(), params);

    let json = JSON.parse(Deno.readTextFileSync(tempfile));
    Deno.removeSync(tempfile);

    assertEquals(json.property, "newValue");
})

Deno.test('JsonSet - should set simple number property', async () => {
    let tempfile = Deno.makeTempFileSync();
    Deno.copyFileSync(TestHelper.resolveTestFile('json/test.json'), tempfile);

    const config = TestHelper.getConfig();
    const action = new JsonSet(config);
    const params = ["numberProperty", "25.00", tempfile];

    await action.execute(TestHelper.mockPackage(), params);

    let json = JSON.parse(Deno.readTextFileSync(tempfile));
    Deno.removeSync(tempfile);

    assertEquals(json.numberProperty, 25.00);
})

Deno.test('JsonSet - should set simple boolean property', async () => {
    let tempfile = Deno.makeTempFileSync();
    Deno.copyFileSync(TestHelper.resolveTestFile('json/test.json'), tempfile);

    const config = TestHelper.getConfig();
    const action = new JsonSet(config);
    const params = ["booleanProperty", "true", tempfile];

    await action.execute(TestHelper.mockPackage(), params);

    let json = JSON.parse(Deno.readTextFileSync(tempfile));
    Deno.removeSync(tempfile);

    assertEquals(json.booleanProperty, true);
})

Deno.test('JsonSet - should set an inner string property', async () => {
    let tempfile = Deno.makeTempFileSync();
    Deno.copyFileSync(TestHelper.resolveTestFile('json/test.json'), tempfile);

    const config = TestHelper.getConfig();
    const action = new JsonSet(config);
    const params = ["[newObject][newArray][0][stringProperty]", "name", tempfile];

    await action.execute(TestHelper.mockPackage(), params);

    let json = JSON.parse(Deno.readTextFileSync(tempfile));
    Deno.removeSync(tempfile);

    assertEquals(json.newObject.newArray[0].stringProperty, "name");
})

Deno.test('JsonSet - should set an string property with dots', async () => {
    let tempfile = Deno.makeTempFileSync();
    Deno.copyFileSync(TestHelper.resolveTestFile('json/test.json'), tempfile);

    const config = TestHelper.getConfig();
    const action = new JsonSet(config);
    const params = ["newProperty.with.dots", "dotValue", tempfile];

    await action.execute(TestHelper.mockPackage(), params);

    let json = JSON.parse(Deno.readTextFileSync(tempfile));
    Deno.removeSync(tempfile);

    assertEquals(json["newProperty.with.dots"], "dotValue");
})

Deno.test('JsonSet - should NOT set an inner string property that exists', async () => {
    let tempfile = Deno.makeTempFileSync();
    Deno.copyFileSync(TestHelper.resolveTestFile('json/test.json'), tempfile);

    const config = TestHelper.getConfig();
    const action = new JsonSet(config);
    const params = ["--ifNotExists", "[objectProperty][innerProperty]", "newValue", tempfile];

    await action.execute(TestHelper.mockPackage(), params);

    let json = JSON.parse(Deno.readTextFileSync(tempfile));
    Deno.removeSync(tempfile);

    assertEquals(json.objectProperty.innerProperty, "innerValue");
})

Deno.test('JsonSet - should NOT set an inner string property that exists', async () => {
    let tempfile = Deno.makeTempFileSync();
    Deno.copyFileSync(TestHelper.resolveTestFile('json/test.json'), tempfile);

    const config = TestHelper.getConfig();
    const action = new JsonSet(config);
    const params = ["--ifNotExists", "[objectProperty][innerProperty]", "newValue", tempfile];

    await action.execute(TestHelper.mockPackage(), params);

    let json = JSON.parse(Deno.readTextFileSync(tempfile));
    Deno.removeSync(tempfile);

    assertEquals(json.objectProperty.innerProperty, "innerValue");
})

Deno.test('JsonSet - should set an string property with dots', async () => {
    let tempfile = Deno.makeTempFileSync();
    Deno.copyFileSync(TestHelper.resolveTestFile('json/test.json'), tempfile);

    const config = TestHelper.getConfig();
    const action = new JsonSet(config);
    const params = ["--ifNotExists", "property.with.dots", "newValue", tempfile];

    await action.execute(TestHelper.mockPackage(), params);

    let json = JSON.parse(Deno.readTextFileSync(tempfile));
    Deno.removeSync(tempfile);

    assertEquals(json["property.with.dots"], "dotValue");
})
