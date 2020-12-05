import {runLevinWithLog} from "./levain.ts";

import {assertEquals,} from "https://deno.land/std/testing/asserts.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {assertFind} from "./lib/test/more_asserts.ts";
import OsUtils from "./lib/os_utils.ts";


// Deno.test('should show help message when no command was included',
Deno.test('should create a homeLog and a tempLog by default', async () => {
        let logger
        try {
            logger = await runLevinWithLog()

            const logFiles = logger?.logFiles || []
            assertEquals(logFiles.length, 2)
            const expectedHomeLog = path.resolve(OsUtils.homeFolder, 'levain.log')
            assertFind(logFiles, it => it === expectedHomeLog, `couldn't find home ${expectedHomeLog} log in ${logFiles}`)
            assertFind<string>(logFiles, it => !!it.match(/levain-\d{8}-\d{6}-\w{8}.log/))

        } finally {
            await logger?.close()
        }
    }
)

Deno.test('should add an extra log file', async () => {
    let logger
    try {
        const extraLogFile = Deno.makeTempFileSync();
        const params = `--add-log ${extraLogFile}`

        logger = await runLevinWithLog(params.split(' '))
        const logFiles = logger?.logFiles || []
        assertEquals(logFiles.length, 3)
        assertFind(logFiles, it => it === extraLogFile, 'didn\'t use extra log')
    } finally {
        await logger?.close()
    }
})

Deno.test('should add an extra log dir', async () => {
    let logger
    try {
        const extraLogDir = Deno.makeTempDirSync();
        const params = `--add-log-dir ${extraLogDir}`

        logger = await runLevinWithLog(params.split(' '))
        const logFiles = logger?.logFiles || []
        assertEquals(logFiles.length, 3)
        assertFind(
            logFiles,
            it => it.includes(extraLogDir) && !!it.match(/levain-\w+-\d{8}-\w{6}.log$/),
            'didn\'t use extra log dir'
        )
    } finally {
        await logger?.close()
    }
})
