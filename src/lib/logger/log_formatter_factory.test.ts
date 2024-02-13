import {assertEquals, assertMatch,} from "https://deno.land/std/assert/mod.ts";

import Config from "../config.ts";
import ConsoleAndFileLogger from "./console_and_file_logger.ts";
import TestHelper from "../test/test_helper.ts";
import LogFormatterFactory from "./log_formatter_factory.ts";

Deno.test('should hide passwords', () => {
    const config = new Config([])
    config.password = '123456'
    ConsoleAndFileLogger.config = config
    const formatter = LogFormatterFactory.getHidePasswordFormatter()
    const logRecord = TestHelper.logRecord(`My password is ${config.password}.`)

    const logLine = formatter(logRecord)

    assertEquals(logLine, 'My password is ******.')
})

Deno.test('should add datetime and level, and hide password', () => {
    const config = new Config([])
    config.password = '123456'
    ConsoleAndFileLogger.config = config
    const formatter = LogFormatterFactory.getFormatterWithDatetimeAndLevel()
    const logRecord = TestHelper.logRecord(`My password is ${config.password}.`)

    const logLine = formatter(logRecord)

    assertMatch(logLine, /\d{8}-\d{6} INFO My password is \*\*\*\*\*\*./)
})
