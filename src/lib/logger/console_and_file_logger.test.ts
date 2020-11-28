import {assertEquals, assertMatch,} from "https://deno.land/std/testing/asserts.ts";

import ConsoleAndFileLogger from "./console_and_file_logger.ts";
import Config from "../config.ts";
import FakeHelper from "../test/FakeHelper.ts";

Deno.test({
    name: 'should setup logger',
    async fn() {
        await ConsoleAndFileLogger.setup()
    },
    sanitizeResources: false,
    sanitizeOps: false,
})

Deno.test({
    name: 'should have option to skip local file log',
    async fn() {
        await ConsoleAndFileLogger.setup(true)
    },
    sanitizeResources: false,
    sanitizeOps: false,
})

//
// getHidePasswordFormatter
//
Deno.test('should hide passwords', () => {
    const config = new Config([])
    config.password = '123456'
    ConsoleAndFileLogger.setConfig(config)
    const formatter = ConsoleAndFileLogger.getHidePasswordFormatter()
    const logRecord = FakeHelper.logRecord(`My password is ${config.password}.`)

    const logLine = formatter(logRecord)

    assertEquals(logLine, 'My password is ******.')
})

Deno.test('should add datetime and level, and hide password', () => {
    const config = new Config([])
    config.password = '123456'
    ConsoleAndFileLogger.setConfig(config)
    const formatter = ConsoleAndFileLogger.getFormatterWithDatetimeAndLevel()
    const logRecord = FakeHelper.logRecord(`My password is ${config.password}.`)

    const logLine = formatter(logRecord)

    assertMatch(logLine, /\d{8}-\d{6} INFO My password is \*\*\*\*\*\*./)
})
