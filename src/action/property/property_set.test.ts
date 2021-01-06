import TestHelper from "../../lib/test/test_helper.ts";
import ActionFactory from "../action_factory.ts";
import {assert, assertEquals, assertNotEquals, assertThrowsAsync} from "https://deno.land/std/testing/asserts.ts";
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
        const newAddress = '321 The Other st, Nova Scotia, Canada'
        const oldAddress = PropertiesUtils.get(newTempFile, 'address')
        assertNotEquals(oldAddress, newAddress)

        const config = new Config({});
        const action = new PropertySetAction(config)
        await action.execute(TestHelper.mockPackage(), [newTempFile, 'address', newAddress] as string[])

        const fileAddress = PropertiesUtils.get(newTempFile, 'address')
        assertEquals(fileAddress, newAddress)
    } finally {
        TestHelper.remove(newTempFile)
    }
})
Deno.test('PropertySet should throw when parameters are missing', async () => {
    const config = new Config({})
    const action = new PropertySetAction(config)

    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), [])
        },
        Error,
        'Missing parameters in "propertySet ".\nCorrect usage:\npropertySet [--ifNotExists] filename property value'
    )
})
Deno.test('PropertySet should throw when last parameter is missing', async () => {
    const config = new Config({})
    const action = new PropertySetAction(config)

    await assertThrowsAsync(
        async () => {
            await action.execute(TestHelper.mockPackage(), ['filename', 'property'])
        },
        Error,
        'Missing parameters in "propertySet filename property".\nCorrect usage:\npropertySet [--ifNotExists] filename property value'
    )
})
Deno.test('PropertySet --ifNotExists should not change existing value', async () => {
    const originalFile = path.join('testdata', 'properties', 'person.properties')
    const newTempFile = TestHelper.getNewTempFile(originalFile)
    try {
        const key = 'address';
        const newValue = '321 The Other st, Nova Scotia, Canada'
        const oldValue = PropertiesUtils.get(newTempFile, key)
        assertNotEquals(oldValue, newValue)

        const config = new Config({});
        const action = new PropertySetAction(config)
        await action.execute(TestHelper.mockPackage(), ['--ifNotExists', newTempFile, key, newValue] as string[])

        const fileAddress = PropertiesUtils.get(newTempFile, key)
        assertEquals(fileAddress, oldValue)
    } catch (error) {
        throw error
    } finally {
        TestHelper.remove(newTempFile)
    }
})
Deno.test('PropertySet --ifNotExists should set new attr', async () => {
    const originalFile = path.join('testdata', 'properties', 'person.properties')
    const newTempFile = TestHelper.getNewTempFile(originalFile)
    try {
        const key = '-new-attr-'
        const newAddress = '321 The Other st, Nova Scotia, Canada'
        const oldAddress = PropertiesUtils.get(newTempFile, key)
        assertEquals(oldAddress, undefined)

        const config = new Config({});
        const action = new PropertySetAction(config)
        await action.execute(TestHelper.mockPackage(), ['--ifNotExists', newTempFile, key, newAddress] as string[])

        const fileAddress = PropertiesUtils.get(newTempFile, key)
        assertEquals(fileAddress, newAddress)
    } catch (error) {
        throw error
    } finally {
        TestHelper.remove(newTempFile)
    }
})