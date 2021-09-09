import {assertEquals,} from 'https://deno.land/std/testing/asserts.ts';
import * as log from 'https://deno.land/std/log/mod.ts';

import TestLogger from "./test_logger.ts";
import LogUtils from "./log_utils.ts";

Deno.test({
    name: 'TestLogger should hold log messages',
    async fn() {
        const logger = await TestLogger.setup()

        log.debug('Are we there yet?')
        log.info('Hello, log world')
        log.warning('I have a bad feeling about this...')
        log.error('Error message')
        log.critical('Danger! Danger! Danger, Will Robinson!')

        assertEquals([
            'DEBUG Are we there yet?',
            'INFO Hello, log world',
            "WARNING I have a bad feeling about this...",
            'ERROR Error message',
            "CRITICAL Danger! Danger! Danger, Will Robinson!",
        ], logger.messages)

        await LogUtils.closeLogFiles()
    },

    sanitizeResources: false,
    sanitizeOps: false,
})
