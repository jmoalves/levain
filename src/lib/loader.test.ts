import {assertNotEquals,} from "https://deno.land/std@0.78.0/testing/asserts.ts";
import Loader from "./loader.ts";
import Config from "./config.ts";

Deno.test('loadCommand should know the list command', () => {
    const loader = new Loader(new Config([]))
    const listCommand = loader.loadCommandStatic('list')

    assertNotEquals(listCommand, undefined)
})