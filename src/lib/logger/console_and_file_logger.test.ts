import {assertEquals,} from "https://deno.land/std/testing/asserts.ts";
import ConsoleAndFileLogger from "./console_and_file_logger.ts";
import {assertFind, assertNotFind} from "../test/more_asserts.ts";

Deno.test('should setup logger',
    async () => {
        const logFiles = await ConsoleAndFileLogger.setup()

        assertEquals(logFiles.length, 2)
        assertFind(logFiles, it => it === 'levain.log', 'couldn\'t find home log')
        assertFind<string>(logFiles, it => !!it.match(/levain-\d{8}-\d{6}-\w{8}.log/))

        await ConsoleAndFileLogger.close()
    }
)

Deno.test('should have option to skip local file log',
    async () => {
        const logFiles = await ConsoleAndFileLogger.setup(true)

        assertEquals(logFiles.length, 1)
        assertNotFind(logFiles, it => it === 'levain.log', 'should not find home log')
        assertFind<string>(logFiles, it => !!it.match(/levain-\d{8}-\d{6}-\w{8}.log/))

        await ConsoleAndFileLogger.close()
    }
)

