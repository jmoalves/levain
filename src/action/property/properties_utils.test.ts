import PropertiesUtils from "./properties_utils.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {assert, assertEquals} from "https://deno.land/std/testing/asserts.ts";

Deno.test('PropertiesFile should load from a file', () => {
    const filePath = path.join('testdata', 'properties', 'person.properties')

    const propertiesFile = PropertiesUtils.load(filePath)
    const value = propertiesFile.get('name')

    assert(propertiesFile instanceof Map)
    assertEquals(value, 'John Doe')
})
Deno.test('PropertiesFile should trim spaces', () => {
    const filePath = path.join('testdata', 'properties', 'space-around.properties')

    const propertiesFile = PropertiesUtils.load(filePath)
    const value = propertiesFile.get('should trim spaces from attr')

    assertEquals(value, 'should trim spaces from value')
})
Deno.test('PropertiesFile should ignore empty lines', () => {
    const filePath = path.join('testdata', 'properties', 'empty-lines.properties')

    const propertiesFile = PropertiesUtils.load(filePath)

    assertEquals(PropertiesUtils.stringify(propertiesFile), 'key_1=value_1\r\nkey_2=value_2')
})
Deno.test('PropertiesFile should work with empty values', () => {
    const filePath = path.join('testdata', 'properties', 'empty-values.properties')

    const propertiesFile = PropertiesUtils.load(filePath)

    assertEquals(PropertiesUtils.stringify(propertiesFile), 'key_1=\r\nkey_2=')
})
