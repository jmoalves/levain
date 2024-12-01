import {assertEquals,} from "jsr:@std/assert";
import * as path from "jsr:@std/path";

import {assertFind} from "./src/lib/test/more_asserts.ts";
import OsUtils from "./src/lib/os/os_utils.ts";
import CliUtil from "./src/lib/cli_util.ts";
import TestHelper from "./src/lib/test/test_helper.ts";

import Levain from "./levain.ts";


Deno.test('should create a homeLog and a tempLog by default', async () => {
        let logger
        try {
            const levain = new Levain()
            logger = await levain.runLevinWithLog()

            const logFiles = logger?.logFiles || []
            assertEquals(logFiles.length, 2)
            const expectedHomeLog = path.resolve(OsUtils.homeDir, 'levain.log')
            assertFind(logFiles, it => it === expectedHomeLog, `couldn't find home ${expectedHomeLog} log in ${logFiles}`)
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

        CliUtil.testMode = true;

        const levain = new Levain()
        logger = await levain.runLevinWithLog(params.split(' '))
        const logFiles = logger?.logFiles || []
        assertEquals(logFiles.length, 3)
        assertFind(logFiles, it => it === extraLogFile, `didn\'t use extra log ${extraLogFile}`)
    } finally {
        await logger?.close()
    }
})

Deno.test('should add an extra log dir', async () => {
    let logger
    try {
        const extraLogDir = TestHelper.getNewTempDir();
        const params = `--add-log-dir ${extraLogDir}`

        const levain = new Levain()
        logger = await levain.runLevinWithLog(params.split(' '))
        const logFiles = logger?.logFiles || []
        assertEquals(logFiles.length, 3)
        assertFind(
            logFiles,
            it => it.includes(extraLogDir),
            `didn\'t use extra log dir ${extraLogDir}`
        )
    } finally {
        await logger?.close()
    }
})
