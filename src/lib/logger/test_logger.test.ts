import {assertEquals,} from 'https://deno.land/std/testing/asserts.ts';
import * as log from 'https://deno.land/std/log/mod.ts';

import TestLogger from "./test_logger.ts";

Deno.test('should hold log messages', async () => {
    const testHandler = await TestLogger.setup()

    log.info('Hello, log world')

    assertEquals(['INFO Hello, log world'], testHandler.messages)
})