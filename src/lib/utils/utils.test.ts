import {
    assertEquals,
    assertNotEquals,
} from "https://deno.land/std/testing/asserts.ts";

import { homedir, retry } from "./utils.ts";

Deno.test("Utils", () => {
    const home = homedir()

    assertNotEquals(home, undefined);
})

Deno.test("retry", async () => {
    const startTime = performance.now()
    await retry(3, () => { throw "Abort" })
    const endTime = performance.now()

    console.log(`Test took ${endTime - startTime}ms`)
})