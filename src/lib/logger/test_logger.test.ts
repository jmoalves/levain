import {assertEquals,} from 'https://deno.land/std/testing/asserts.ts';
import * as log from 'https://deno.land/std/log/mod.ts';

import TestLogger from "./test_logger.ts";

Deno.test('TestLogger should hold log messages', async () => {
    const logger = await TestLogger.setup()

    log.info('Hello, log world')
    log.warning('I have a bad feeling about this...')
    log.error('Error message')
    log.critical('Danger! Danger! Danger, Will Robinson!')

    assertEquals([
        'INFO Hello, log world',
        "WARNING I have a bad feeling about this...",
        'ERROR Error message',
        "CRITICAL Danger! Danger! Danger, Will Robinson!",
    ], logger.messages)

    logger.destroy()
})
