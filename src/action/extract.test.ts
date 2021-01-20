import {assertEquals,} from "https://deno.land/std/testing/asserts.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import TestHelper from "../lib/test/test_helper.ts";
import {assertFolderIncludes} from "../lib/test/more_asserts.ts";
import FileCache from '../lib/fs/file_cache.ts';

import ExtractAction, {DenoZip} from "./extract.ts";

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
        config.levainCacheDir = Deno.makeTempDirSync()
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
Deno.test({
    name: 'ExtractAction should use cache',
    fn: async () => {
        const src = TestHelper.validZipFile
        const dst = Deno.makeTempDirSync()
        const config = TestHelper.getConfig()
        config.levainCacheDir = Deno.makeTempDirSync()
        const action = new ExtractAction(config)
        const pkg = TestHelper.mockPackage()
        const cachedSrc = new FileCache(config).cachedFilePath(src)

        await action.execute(pkg, [src, dst])

        assertFolderIncludes(config.levainCacheDir, [cachedSrc])
    },
    sanitizeResources: false,
    sanitizeOps: false,
})
//
// Extractor
//

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

    assertFolderIncludes(dst, [dstFile])
})

function getExtractor() {
    const config = TestHelper.getConfig()
    const extractor = new DenoZip(config)
    return extractor;
}
