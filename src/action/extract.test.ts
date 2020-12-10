import Extract from "./extract.ts";
import TestHelper from "../lib/test/test_helper.ts";
import {assertEquals, assertMatch,} from "https://deno.land/std/testing/asserts.ts";
import OsUtils from "../lib/os_utils.ts";

Deno.test('should check if source exists', async () => {
    const src = TestHelper.fileThatDoesNotExist
    const dst = TestHelper.folderThatDoesNotExist

    const config = TestHelper.getConfig()
    const action = new Extract(config)
    const pkg = TestHelper.mockPackage()
    try {
        await action.execute(pkg, [src, dst])
    } catch (err) {
        const pattern = new RegExp(`Cannot find source file ".*${src}"`)
        assertMatch(err.message, pattern)
    }
})
if (OsUtils.isWindows()) {
    Deno.test('should extract src to dst', async () => {
        const src = TestHelper.validZipFile
        const dst = Deno.makeTempDirSync()

        const config = TestHelper.getConfig()
        const action = new Extract(config)
        const pkg = TestHelper.mockPackage()

        await action.execute(pkg, [src, dst])

        const dstFiles = [...Deno.readDirSync(dst)]

        assertEquals(dstFiles, [
            'abc123youandme',
        ])
    })
}

