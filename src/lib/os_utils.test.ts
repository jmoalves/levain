import {assertEquals, assertNotEquals} from "https://deno.land/std/testing/asserts.ts";
import OsUtils from "./os_utils.ts";

Deno.test('should know where is the home folder', () => {
    assertNotEquals(OsUtils.homeFolder, undefined)
})

Deno.test('should know if we are running in Windows', () => {
    const os = Deno.build.os
    const shouldBeWindows = (os === 'windows')
    assertEquals(OsUtils.isWindows(), shouldBeWindows)
})