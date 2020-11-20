import {assertEquals,} from "https://deno.land/std@0.78.0/testing/asserts.ts";
import List from "./list.ts";
import MemoryLogger from "../lib/logger/memoryLogger.ts";
import Config from "../lib/config.ts";

Deno.test('List should be a command', () => {
    const logger = new MemoryLogger()
    const list = new List(new Config([]))
    list.logger = logger

    list.execute()

    assertEquals(logger.getInfo().toString(), "list - no repo found")
})