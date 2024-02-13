import * as path from "https://deno.land/std/path/mod.ts";
import {assertEquals,} from "https://deno.land/std/assert/mod.ts";

import TestHelper from '../test/test_helper.ts';
import {assertFolderIncludes, assertStringEndsWith} from '../test/more_asserts.ts';

import FileCache from './file_cache.ts';

Deno.test('FileCache should get file from cache', async () => {
    const config = TestHelper.getConfig()
    config.levainCacheDir = TestHelper.getNewTempDir()
    const fileCache = new FileCache(config)

    const cachedFile = await fileCache.get(TestHelper.validZipFile)

    const expectedFile = fileCache.cachedFilePath(TestHelper.validZipFile)
    assertEquals(cachedFile, expectedFile)

    assertFolderIncludes(fileCache.dir, [expectedFile])

    // Workaround - https://github.com/denoland/deno/issues/15425
    await new Promise((resolve) => setTimeout(resolve, 0));
})

Deno.test('FileCache should calc cached file path', () => {
    const config = TestHelper.getConfig()
    const fileCache = new FileCache(config)

    assertEquals(
        fileCache.cachedFilePath('/folder/big-file.zip'),
        path.join(fileCache.dir, '_folder_big-file.zip'),
    )
    assertStringEndsWith(
        fileCache.cachedFilePath('d:/folder/big-file.zip'),
        path.join(fileCache.dir, 'd_folder_big-file.zip'),
    )
})
