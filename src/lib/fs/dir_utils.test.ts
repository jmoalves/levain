import {assertArrayIncludes, assertEquals, assertThrows} from "jsr:@std/assert";

import DirUtils from "./dir_utils.ts";
import TestHelper from "../test/test_helper.ts";

const testDataDir = 'testdata/dir_utils';
//
// count
//
Deno.test('DirUtils.count should count dir elements', () => {
    assertEquals(DirUtils.count(testDataDir), 8)
})
Deno.test('DirUtils.count should throw error when folder does not exist', () => {
    let folder = TestHelper.folderThatDoesNotExist;
    assertThrows(
        () => {
            DirUtils.count(folder)
        },
        Deno.errors.NotFound,
        'this-folder-does-not-exist',
    )
})
//
// listFiles
//
Deno.test('DirUtils.listFiles should throw error when directory does not exist', () => {
    let folder = TestHelper.folderThatDoesNotExist;
    assertThrows(
        () => {
            DirUtils.listFiles(folder)
        },
        Deno.errors.NotFound,
        'this-folder-does-not-exist',
    )
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
//
// isDirectory
//
Deno.test('DirUtils.isDirectory should detect that a dir exists', () => {
    const dir = TestHelper.folderThatAlwaysExists
    assertEquals(DirUtils.isDirectory(dir), true)
})
Deno.test('DirUtils.isDirectory should detect that a dir does not exists', () => {
    const doesNotExist = TestHelper.folderThatDoesNotExist
    assertEquals(DirUtils.isDirectory(doesNotExist), false)
})
Deno.test('DirUtils.isDirectory should detect that a file is not a dir', () => {
    const notDir = TestHelper.fileThatExists
    assertEquals(DirUtils.isDirectory(notDir), false)
})
//
// isDirectory
//
Deno.test('DirUtils.isDirectory should detect that a dir exists', () => {
    const dir = TestHelper.folderThatAlwaysExists
    assertEquals(DirUtils.isDirectory(dir), true)
})
Deno.test('DirUtils.isDirectory should detect that a dir does not exists', () => {
    const doesNotExist = TestHelper.folderThatDoesNotExist
    assertEquals(DirUtils.isDirectory(doesNotExist), false)
})
Deno.test('DirUtils.isDirectory should detect that a file is not a dir', () => {
    const notDir = TestHelper.fileThatExists
    assertEquals(DirUtils.isDirectory(notDir), false)
})
//
// isDirectory
//
Deno.test('DirUtils.isDirectory should detect that a dir exists', () => {
    const dir = TestHelper.folderThatAlwaysExists
    assertEquals(DirUtils.isDirectory(dir), true)
})
Deno.test('DirUtils.isDirectory should detect that a dir does not exists', () => {
    const doesNotExist = TestHelper.folderThatDoesNotExist
    assertEquals(DirUtils.isDirectory(doesNotExist), false)
})
Deno.test('DirUtils.isDirectory should detect that a file is not a dir', () => {
    const notDir = TestHelper.fileThatExists
    assertEquals(DirUtils.isDirectory(notDir), false)
})
