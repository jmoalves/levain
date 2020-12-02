import {assertEquals,} from "https://deno.land/std/testing/asserts.ts";
import ConsoleAndFileLogger from "./console_and_file_logger.ts";

Deno.test('should setup logger with logFiles and console', async () => {
    const logFiles = [
        Deno.makeTempFileSync(),
        Deno.makeTempFileSync(),
    ]

    const logger = await ConsoleAndFileLogger.setup(logFiles)

    assertEquals(logger?.logFiles, logFiles)
    assertEquals(Object.keys(logger?.handlers).length, 3)

    await logger.close()
})
