import {runLevinWithLog} from "./levain.ts";

import {assertEquals,} from "https://deno.land/std/testing/asserts.ts";
import {assertFind} from "./lib/test/more_asserts.ts";
import OsUtils from "./lib/os_utils.ts";


// Deno.test('should show help message when no command was included',
Deno.test('should create a homeLog and a tempLog by default', async () => {

        const logger = await runLevinWithLog()

        const logFiles = logger?.logFiles || []
        assertEquals(logFiles.length, 2)
        assertFind(logFiles, it => it === `${OsUtils.homeFolder}/levain.log`, 'couldn\'t find home log')
        assertFind<string>(logFiles, it => !!it.match(/levain-\d{8}-\d{6}-\w{8}.log/))

        await logger?.close()
    }
)

Deno.test('should add an extra log file', async () => {

    const extraLogFile = Deno.makeTempFileSync();
    const params = `--add-log ${extraLogFile}`

    const logger = await runLevinWithLog(params.split(' '))
    const logFiles = logger?.logFiles || []
    assertEquals(logFiles.length, 3)
    assertFind(logFiles, it => it === extraLogFile, 'couldn\'t find extra log')

    await logger?.close()
 
})