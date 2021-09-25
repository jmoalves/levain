import ConfigPersistentAttributes from "./config-persistent-attributes.ts";
import {assertEquals, assertNotEquals,} from "https://deno.land/std/testing/asserts.ts";

Deno.test('ConfigPersistentAttributes with no attrs changed should be equal', () => {
    const config1 = new ConfigPersistentAttributes()

    const config2 = new ConfigPersistentAttributes()

    assertEquals(config1, config2)
})
Deno.test('ConfigPersistentAttributes should be equal if atributes are equal', () => {
    const config1 = new ConfigPersistentAttributes()
    config1.lastKnownVersion = '1.2.3'
    config1.cacheDir = 'abc'

    const config2 = new ConfigPersistentAttributes()
    config2.cacheDir = 'ab' + 'c'
    config2.lastKnownVersion = '1.2.3'

    assertEquals(config1, config2)
})
Deno.test('ConfigPersistentAttributes should be different if atributes are different', () => {
    const config1 = new ConfigPersistentAttributes()
    config1.lastKnownVersion = '3.2.1'

    const config2 = new ConfigPersistentAttributes()
    config2.lastKnownVersion = '1.2.3'

    assertNotEquals(config1, config2)
})
