import ExtractAction, {DenoZip} from "./extract.ts";
import TestHelper from "../lib/test/test_helper.ts";
import {assertArrayIncludes, assertEquals,} from "https://deno.land/std/testing/asserts.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {assertFolderIncludes, assertStringEndsWith} from "../lib/test/more_asserts.ts";

Deno.test('ExtractAction should check if source exists', async () => {
    const src = TestHelper.fileThatDoesNotExist
    const dst = TestHelper.folderThatDoesNotExist
    const config = TestHelper.getConfig()
    const action = new ExtractAction(config)
    const pkg = TestHelper.mockPackage()
    try {
        await action.execute(pkg, [src, dst])
    } catch (err) {

        const msg = `Cannot find source file "${src}"`
        assertEquals(err.message, msg)
    }
})

Deno.test({
    name: 'ExtractAction should extract src to dst',
    fn: async () => {
        const src = TestHelper.validZipFile
        const dst = Deno.makeTempDirSync()
        const config = TestHelper.getConfig()
        const action = new ExtractAction(config)
        const pkg = TestHelper.mockPackage()

        await action.execute(pkg, [src, dst])

        const expectedFiles = [
            path.join(dst, 'test'),
            path.join(dst, 'test', 'abc.txt'),
            path.join(dst, 'test', 'hello.txt'),
        ];
        assertFolderIncludes(dst, expectedFiles);
    },
    sanitizeResources: false,

    sanitizeOps: false,
})
//
// Extractor
//
Deno.test('Extractor should calc cached file path', () => {
    const extractor = getExtractor();

    assertStringEndsWith(
        extractor.cachedFilePath('/folder/big-file.zip'),
        '/levain/.levain/cache/_folder_big-file.zip',
    )
})
// Deno.test('Extractor should copy file to folder', async () => {
//     const extractor = getExtractor();
//     const src = 'testdata/extract/test.zip'
//     const srcFileName = path.basename(src)
//     const dst = TestHelper.getNewTempDir()
//
//     await extractor.copy(src, dst)
//
//
//     assertFolderIncludes(dst, [srcFileName])
// })
Deno.test('Extractor should copy srcFile to dstFile', async () => {
    const extractor = getExtractor();
    const srcFile = 'testdata/extract/test.zip'
    const srcFileName = path.basename(srcFile)
    const dst = TestHelper.getNewTempDir()
    const dstFile = path.join(dst, srcFileName)

    await extractor.copy(srcFile, dstFile)

    assertArrayIncludes(["/var/folders/t9/82rj2gb570s_nylktr447ln40000gn/T/b7ebcce1", "test.zip"], ["test.zip"])
    assertFolderIncludes(dst, [dstFile])
})

function getExtractor() {
    const config = TestHelper.getConfig()
    const extractor = new DenoZip(config)
    return extractor;
}