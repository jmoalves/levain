import DirUtils from "./dir_utils.ts";
import {assertArrayIncludes} from "https://deno.land/std/testing/asserts.ts";

Deno.test('should list file names', () => {
    const fileNames = DirUtils.listFileNames('./testdata/extract')

    assertArrayIncludes(DirUtils.normalizePaths(fileNames), [
        "testdata/extract",
        "testdata/extract/test",
        "testdata/extract/test/abc.txt",
        "testdata/extract/test/hello.txt",
        "testdata/extract/test.zip",
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
