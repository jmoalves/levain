import {assertEquals,} from "https://deno.land/std/testing/asserts.ts";

import TestHandler from "./test_handler.ts";

Deno.test('should hold log messages', () => {
    const testHandler = new TestHandler('DEBUG')

    testHandler.log('Hello, log world')

    assertEquals(['Hello, log world'], testHandler.messages)
})