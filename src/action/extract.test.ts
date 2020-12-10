import Extract from "./extract.ts";
import TestHelper from "../lib/test/test_helper.ts";
import {assertArrayIncludes, assertMatch,} from "https://deno.land/std/testing/asserts.ts";
import DirUtils from "../lib/dir_utils.ts";

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

Deno.test({
    name: 'should extract src to dst',
    fn: async () => {
        const src = TestHelper.validZipFile
        const dst = Deno.makeTempDirSync()

        const config = TestHelper.getConfig()
        const action = new Extract(config)
        const pkg = TestHelper.mockPackage()

        await action.execute(pkg, [src, dst])

        const dstFiles = DirUtils.listFileNames(dst)

        assertArrayIncludes(dstFiles, [
            `${dst}/test`,
            `${dst}/test/abc.txt`,
            `${dst}/test/hello.txt`,
        ])
    },
    sanitizeResources: false,
    sanitizeOps: false,
})
