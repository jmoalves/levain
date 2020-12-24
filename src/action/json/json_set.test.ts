import {assertEquals, assertThrowsAsync} from "https://deno.land/std/testing/asserts.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import TestHelper from "../../lib/test/test_helper.ts";
import JsonSet from "./json_set.ts";

Deno.test('JsonSet - should throw exception for missing parameters', async () => {
    const action = new JsonSet(TestHelper.getConfig());
    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), []);
        },
        Error,
        'Missing parameters. jsonSet [--ifNotExists] filename property value'
    )
})

Deno.test('JsonSet - should throw exception for missing parameters', async () => {
    const action = new JsonSet(TestHelper.getConfig());
    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), ["property"]);
        },
        Error,
        'Missing parameters. jsonSet [--ifNotExists] filename property value'
    )
})

Deno.test('JsonSet - should throw exception for missing parameters', async () => {
    const action = new JsonSet(TestHelper.getConfig());
    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), ["--ifNotExists", "filename"]);
        },
        Error,
        'Missing parameters. jsonSet [--ifNotExists] filename property value'
    )
})

Deno.test('JsonSet - should throw exception for missing parameters', async () => {
    const action = new JsonSet(TestHelper.getConfig());
    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), ["filename", "--ifNotExists"]);
        },
        Error,
        'Missing parameters. jsonSet [--ifNotExists] filename property value'
    )
})


Deno.test('JsonSet - should throw exception for missing parameters', async () => {
    const action = new JsonSet(TestHelper.getConfig());
    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), ["property", "value", "--ifNotExists"]);
        },
        Error,
        'Missing parameters. jsonSet [--ifNotExists] filename property value'
    )
})


Deno.test('JsonSet - should set simple string property', async () => {
    let tempfile = Deno.makeTempFileSync();
    Deno.copyFileSync(TestHelper.resolveTestFile('json/test.json'), tempfile);
    const action = getJsonSetAction();
    const params = [tempfile, "property", "newValue"];

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
    const params = [tempfile, "numberProperty", "25.00"];

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
    const params = [tempfile, "booleanProperty", "true"];

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
    const params = [tempfile, "[newObject][newArray][0][stringProperty]", "name"];

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
    const params = [tempfile, "newProperty.with.dots", "dotValue"];

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
    const params = ["--ifNotExists", tempfile, "[objectProperty][innerProperty]", "newValue"];

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
    const params = ["--ifNotExists", tempfile, "[objectProperty][innerProperty]", "newValue"];

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
    const params = ["--ifNotExists", tempfile, "property.with.dots", "newValue"];

    await action.execute(TestHelper.mockPackage(), params);

    let json = JSON.parse(Deno.readTextFileSync(tempfile));
    Deno.removeSync(tempfile);

    assertEquals(json["property.with.dots"], "dotValue");
})

Deno.test('JsonSet - should set a new array element', async () => {
    let tempfile = Deno.makeTempFileSync();
    Deno.copyFileSync(TestHelper.resolveTestFile('json/test.json'), tempfile);

    const config = TestHelper.getConfig();
    const action = new JsonSet(config);
    const params = [tempfile, "[arrayProperty][:+1:]", "newElement"];

    await action.execute(TestHelper.mockPackage(), params);

    let json = JSON.parse(Deno.readTextFileSync(tempfile));
    Deno.removeSync(tempfile);

    assertEquals(json.arrayProperty.length, 4);
    assertEquals(json.arrayProperty[3], "newElement");
})

Deno.test('JsonSet - should set the last array element', async () => {
    let tempfile = Deno.makeTempFileSync();
    Deno.copyFileSync(TestHelper.resolveTestFile('json/test.json'), tempfile);

    const config = TestHelper.getConfig();
    const action = new JsonSet(config);
    const params = [tempfile, "[arrayProperty][:last:]", "changed"];

    await action.execute(TestHelper.mockPackage(), params);

    let json = JSON.parse(Deno.readTextFileSync(tempfile));
    Deno.removeSync(tempfile);

    assertEquals(json.arrayProperty.length, 3);
    assertEquals(json.arrayProperty[2], "changed");
})

Deno.test('JsonSet - should set an string property with a windows path', async () => {
    let tempfile = Deno.makeTempFileSync();
    Deno.copyFileSync(TestHelper.resolveTestFile('json/test.json'), tempfile);

    const config = TestHelper.getConfig();
    const action = new JsonSet(config);
    const params = [tempfile, "pathProperty", "d:\\test\\dir\\subdir"];

    await action.execute(TestHelper.mockPackage(), params);

    let json = JSON.parse(Deno.readTextFileSync(tempfile));
    Deno.removeSync(tempfile);

    assertEquals(json.pathProperty, "d:\\test\\dir\\subdir");
})
Deno.test('JsonSet should create file when it doesnt exist', () => {
    const tempDir = Deno.makeTempDirSync()
    const newFilePath = path.join(tempDir, 'new.json')
    const action = getJsonSetAction()

    const params = [newFilePath, 'newProperty', 'newValue']
    action.execute(TestHelper.mockPackage(), params)

    const newFileText = Deno.readTextFileSync(newFilePath)
    Deno.removeSync(newFilePath);

    assertEquals(newFileText, '{\n   "newProperty": "newValue"\n}')
})
Deno.test('JsonSet should set an attr when file is empty', () => {
    
    let emptyTempFile = Deno.makeTempFileSync();
    const action = getJsonSetAction()

    const params = [emptyTempFile, 'pathProperty', 'newValue']
    action.execute(TestHelper.mockPackage(), params)

    const text = Deno.readTextFileSync(emptyTempFile);
    const json = JSON.parse(text);
    Deno.removeSync(emptyTempFile);
    assertEquals(json.pathProperty, "newValue");
})

function getJsonSetAction() {
    const config = TestHelper.getConfig();
    return new JsonSet(config);
}
