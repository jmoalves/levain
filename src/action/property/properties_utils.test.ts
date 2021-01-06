import PropertiesUtils from "./properties_utils.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {assert, assertEquals, assertNotEquals} from "https://deno.land/std/testing/asserts.ts";
import TestHelper from "../../lib/test/test_helper.ts";

//
// load
//
Deno.test('PropertiesUtils should load from a file', () => {

    const propertiesFile = PropertiesUtils.load(personFilePath)
    const value = propertiesFile.get('name')

    assert(propertiesFile instanceof Map)
    assertEquals(value, 'John Doe')
})
Deno.test('PropertiesUtils should trim spaces', () => {
    const filePath = path.join('testdata', 'properties', 'space-around.properties')

    const propertiesFile = PropertiesUtils.load(filePath)
    const value = propertiesFile.get('should trim spaces from attr')

    assertEquals(value, 'should trim spaces from value')
})
Deno.test('PropertiesUtils should ignore empty lines', () => {
    const filePath = path.join('testdata', 'properties', 'empty-lines.properties')

    const propertiesFile = PropertiesUtils.load(filePath)

    assertEquals(PropertiesUtils.stringify(propertiesFile), 'key_1=value_1\r\nkey_2=value_2')
})
Deno.test('PropertiesUtils should work with empty values', () => {
    const filePath = path.join('testdata', 'properties', 'empty-values.properties')

    const propertiesFile = PropertiesUtils.load(filePath)

    assertEquals(PropertiesUtils.stringify(propertiesFile), 'key_1=\r\nkey_2=')
})
//
// get
//
Deno.test('PropertiesUtils.get should get value', () => {
    const value = PropertiesUtils.get(personFilePath, 'name')

    assertEquals(value, 'John Doe')
})
Deno.test('PropertiesUtils.get should get undefined value', () => {
    const value = PropertiesUtils.get(personFilePath, '--unknown-attributes--')

    assertEquals(value, undefined)
})
Deno.test('PropertiesUtils.get should get default value when value is indefined and defualt is defined', () => {
    const value = PropertiesUtils.get(personFilePath, '--unknown-attributes--', 'default value')

    assertEquals(value, 'default value')
})
//
// save
//
Deno.test('PropertiesUtils.save should save content', () => {
    const newFilePath = TestHelper.getNewTempFile()
    const content = new Map<string, string>()
    const key = TestHelper.randomString()
    const value = TestHelper.randomString()
    content.set(key, value)

    PropertiesUtils.save(newFilePath, content)

    const savedPropertiesMap = PropertiesUtils.load(newFilePath)
    const stringSavedProps = PropertiesUtils.stringify(savedPropertiesMap)
    assertEquals(stringSavedProps, `${key}=${value}`)
})
//
// set
//
Deno.test('PropertiesUtils.set should change a value', async () => {
    const originalFile = path.join('testdata', 'properties', 'person.properties')
    const newTempFile = TestHelper.getNewTempFile(originalFile)
    try {
        const expectedValue = '321 The Other st, Nova Scotia, Canada'
        const key = 'address';
        const oldValue = PropertiesUtils.get(newTempFile, key)
        assertNotEquals(oldValue, expectedValue)

        PropertiesUtils.set(newTempFile, key, expectedValue)

        const newAddress = PropertiesUtils.get(newTempFile, key)
        assertEquals(newAddress, expectedValue)
    } finally {
        TestHelper.remove(newTempFile)
    }
})
Deno.test('PropertiesUtils.set should create the file if it does not exist', async () => {
    const newTempFile = TestHelper.getNewTempFile()
    try {
        TestHelper.remove(newTempFile)

        const key = 'email';
        const expectedValue = 'john@doe.com';

        PropertiesUtils.set(newTempFile, key, expectedValue)

        const currentValue = PropertiesUtils.get(newTempFile, key)
        assertEquals(currentValue, expectedValue)
    } finally {
        TestHelper.remove(newTempFile)
    }
})
Deno.test('PropertiesUtils.set should work with a empty file', async () => {
    const newTempFile = TestHelper.getNewTempFile()
    try {
        const key = 'email';
        const expectedValue = 'john@doe.com';

        PropertiesUtils.set(newTempFile, key, expectedValue)

        const currentValue = PropertiesUtils.get(newTempFile, key)
        assertEquals(currentValue, expectedValue)
    } finally {
        TestHelper.remove(newTempFile)
    }
})
Deno.test('PropertiesUtils.set should work with a new attribute', async () => {
    const newTempFile = TestHelper.getNewTempFile()
    try {
        const key = '--new-attribute--';
        const expectedValue = 'sbrubles';

        PropertiesUtils.set(newTempFile, key, expectedValue)

        const currentValue = PropertiesUtils.get(newTempFile, key)
        assertEquals(currentValue, expectedValue)
    } finally {
        TestHelper.remove(newTempFile)
    }
})
Deno.test('PropertiesUtils.set should not replace value when ifNotExists', async () => {
    const originalFile = path.join('testdata', 'properties', 'person.properties')
    const newTempFile = TestHelper.getNewTempFile(originalFile)
    try {
        const newValue = '321 The Other st, Nova Scotia, Canada'
        const key = 'address';
        const oldValue = PropertiesUtils.get(newTempFile, key)
        assertNotEquals(oldValue, newValue)

        PropertiesUtils.set(newTempFile, key, newValue, true)

        const fileValue = PropertiesUtils.get(newTempFile, key)
        assertEquals(fileValue, oldValue)
    } finally {
        TestHelper.remove(newTempFile)
    }
})
//
// fixtures
//
const personFilePath = path.join('testdata', 'properties', 'person.properties')
