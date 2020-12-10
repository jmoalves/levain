import Extract from "./extract.ts";
import TestHelper from "../lib/test/test_helper.ts";
import {assertArrayIncludes, assertEquals,} from "https://deno.land/std/testing/asserts.ts";
import * as path from "https://deno.land/std/path/mod.ts";
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

        const msg = `Cannot find source file "${src}"`
        assertEquals(err.message, msg)
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
            path.join(dst, 'test'),
            path.join(dst, 'test', 'abc.txt'),
            path.join(dst, 'test', 'hello.txt'),
        ])
    },
    sanitizeResources: false,
    sanitizeOps: false,
})
