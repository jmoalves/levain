import {assertArrayIncludes, assertEquals} from "https://deno.land/std/testing/asserts.ts";

import DirUtils from "./dir_utils.ts";
import TestHelper from "../test/test_helper.ts";

const testDataDir = 'testdata/dir_utils';

//
// count
//
Deno.test('DirUtils.count should count dir elements', () => {
    assertEquals(DirUtils.count(testDataDir), 8)
})
Deno.test('DirUtils.count should return 0 when folder does not exist', () => {
    let folder = TestHelper.folderThatDoesNotExist;
    assertEquals(DirUtils.count(folder), 0)
})

//
// listFiles
//
Deno.test('DirUtils.listFiles should return empty array when directory does not exist', () => {
    let folder = TestHelper.folderThatDoesNotExist;
    assertEquals(DirUtils.listFiles(folder), [])
})
//
// listFileNames
//
Deno.test('DirUtils.listFileNames should list file names', () => {
    const fileNames = DirUtils.listFileNames(testDataDir)

    assertArrayIncludes(DirUtils.normalizePaths(fileNames), [
        // "testdata/dir_utils",
        "testdata/dir_utils/test",
        "testdata/dir_utils/test/abc.txt",
        "testdata/dir_utils/test/hello.txt",
        "testdata/dir_utils/test.zip",
        "testdata/dir_utils/test.zip/test",
        "testdata/dir_utils/test.zip/test/abc.txt",
        "testdata/dir_utils/test.zip/test/hello.txt",
        "testdata/dir_utils/hello.txt",
    ])
})

//
// normalizePaths
//
Deno.test('DirUtils.normalizePaths should normalize paths', () => {
    const fileNames = [
        '/path/to/file',
        '\\path\\to\\another\\file',
        '\\third\\file\\with/mixed/bars',
    ]

    const normalizedPaths = DirUtils.normalizePaths(fileNames)

    assertArrayIncludes(normalizedPaths, [
        '/path/to/file',
        '/path/to/another/file',
        '/third/file/with/mixed/bars',
    ])
})
