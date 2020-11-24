import {
    assertEquals,
    assertNotEquals,
} from "https://deno.land/std/testing/asserts.ts";
import {homedir} from "./utils.ts";

Deno.test("Utils", () => {
    const home = homedir()

    assertNotEquals(home, undefined);
})