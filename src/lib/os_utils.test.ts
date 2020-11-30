import {assertNotEquals} from "https://deno.land/std/testing/asserts.ts";
import OsUtils from "./os_utils.ts";

Deno.test('should know where is the home folder', () => {
    assertNotEquals(OsUtils.homeFolder, undefined)
})