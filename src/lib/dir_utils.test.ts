import DirUtils from "./dir_utils.ts";
import {assertArrayIncludes, assertEquals} from "https://deno.land/std/testing/asserts.ts";

const testDataDir = './testdata/dir_utils';

Deno.test('should count dir elements', () => {
    assertEquals(DirUtils.count(testDataDir), 8)
})
Deno.test('should list file names', () => {
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
Deno.test('should normalize paths', () => {
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
