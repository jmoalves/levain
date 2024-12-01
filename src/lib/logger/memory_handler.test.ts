import {assertEquals,} from "jsr:@std/assert";

import MemoryHandler from "./memory_handler.ts";

Deno.test('MemoryHandler should hold log messages', () => {
    const memoryHandler = new MemoryHandler('DEBUG')

    memoryHandler.log('Hello, log world')

    assertEquals(['Hello, log world'], memoryHandler.messages)
})