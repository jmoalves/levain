import {assertEquals, assertNotEquals} from "https://deno.land/std/testing/asserts.ts";
import OsUtils from "./os_utils.ts";

Deno.test('should know where is the temp folder', () => {
    assertNotEquals(OsUtils.tempDir, undefined)
})
Deno.test('should know where is the home folder', () => {
    assertNotEquals(OsUtils.homeDir, undefined)
})
Deno.test('should know the users login', () => {
    assertNotEquals(OsUtils.login, undefined)
})
Deno.test('should know if we are running in Windows', () => {
    const os = Deno.build.os
    const shouldBeWindows = (os === 'windows')
    assertEquals(OsUtils.isWindows(), shouldBeWindows)
})
