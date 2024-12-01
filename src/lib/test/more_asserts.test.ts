import {AssertionError, assertThrows} from "jsr:@std/assert";

import {
    assertArrayEndsWith,
    assertArrayEqualsInAnyOrder,
    assertDirCount,
    assertDirCountGreaterOrEqualTo,
    assertFileSizeAprox,
    assertFind,
    assertFolderDoesNotInclude,
    assertFolderIncludes,
    assertGreaterOrEqualTo,
    assertGreaterThan,
    assertNotFind,
    assertNumberEquals,
    assertPathDoesNotExist,
    assertPathEndsWith,
    assertStringEndsWith,
} from "./more_asserts.ts";
import TestHelper from "./test_helper.ts";

const testdataMoreAssertsFolder = TestHelper.getTestDataPath('more_asserts');
const testdataMoreAssertsFile = TestHelper.getTestDataPath('more_asserts/file.txt');
const testdataAssertFolderIncludes = TestHelper.getTestDataPath('assertFolderIncludes')

//
// assertsStringEndsWith
//
Deno.test('MoreAsserts.assertsStringEndsWith should raise error when string doesnt end the expected way', () => {
    assertThrows(
        () => {
            assertStringEndsWith('abc', 'yz')
        },
        AssertionError,
        'Expected "abc" to end with "yz"'
    )
})

Deno.test('MoreAsserts.assertsStringEndsWith should raise error when string doesnt end the expected way', () => {
    assertStringEndsWith('supercalifragilisticexpialidocious', 'docious')
})
//
// assertArrayEndsWith
//
Deno.test('MoreAsserts.assertArrayEndsWith should raise error when arrays are completly different', () => {
    assertThrows(
        () => {
            assertArrayEndsWith([1, 2, 3], [6, 7, 8])
        },
        AssertionError,
        // "expected [1,2,3] to end with [6,7,8]"
    )
})
Deno.test('MoreAsserts.assertArrayEndsWith should detect numeric array ending', () => {
    assertArrayEndsWith([1, 2, 3], [2, 3])
})
Deno.test('MoreAsserts.assertArrayEndsWith should raise error when string array ends are different', () => {
    assertThrows(
        () => {
            assertArrayEndsWith(['abc', 'xyz'], ['abc'])
        },
        AssertionError,
        // `expected ["abc","xyz"] to end with ["abc"]`
    )
})
Deno.test('MoreAsserts.assertArrayEndsWith should detect string array ending', () => {
    assertArrayEndsWith(['abc', '123', 'do re mi'], ['123', 'do re mi'])
})
//
// assertFind
//
Deno.test('MoreAsserts.assertFind should find and assert', () => {
    assertFind([1, 2, 3], it => it === 2)
})

Deno.test('MoreAsserts.assertFind should throw AssertionError when nothing is found', () => {
    assertThrows(
        () => assertFind([1, 2, 3], it => it === 3.1416),
        AssertionError,
        'Could\'t find expected element',
    )
})
//
// assertNotFind
//
Deno.test('MoreAsserts.assertNotFind should not find and assert', () => {
    assertNotFind([1, 2, 3], it => it === 3.1416)
})

Deno.test('MoreAsserts.assertNotFind should throw AssertionError when element is found', () => {
    assertThrows(
        () => assertNotFind([1, 2, 3], it => it === 2),
        AssertionError,
        'Shouldn\'t be able to find element',
    )
})
//
// assertArrayContainsInAnyOrder
//
Deno.test('MoreAsserts.assertArrayContainsInAnyOrder should assert that elements are equal, even in different order', () => {
    assertArrayEqualsInAnyOrder([1, 2, 3], [2, 3, 1])
})
Deno.test('MoreAsserts.assertArrayContainsInAnyOrder should find out that one element is missing', () => {
    assertThrows(
        () => {
            assertArrayEqualsInAnyOrder([1, 2], [1, 2, 3])
        },
        AssertionError,
    )
})
//
// assertFolderIncludes
//
Deno.test('MoreAsserts.assertFolderIncludes should assert a file is in a folder', () => {
    assertFolderIncludes(testdataAssertFolderIncludes, ['file.txt'])
})
Deno.test('MoreAsserts.assertFolderIncludes should find out that a file is missing', () => {
    assertThrows(
        () => {
            assertFolderIncludes(testdataAssertFolderIncludes, ['abc123.doc'])
        },
        AssertionError,
        "abc123.doc",
    )
})
//
// assertFolderDoesNotInclude
//
Deno.test('MoreAsserts.assertFolderDoesNotInclude should assert a file is not in a folder', () => {
    assertFolderDoesNotInclude(testdataAssertFolderIncludes, ['abc123.doc'])
})
Deno.test('MoreAsserts.assertFolderIncludes should find out that a file exists in the folder', () => {
    assertThrows(
        () => {
            assertFolderDoesNotInclude(testdataAssertFolderIncludes, ['file.txt'])
        },
        AssertionError,
        "file.txt",
    )
})
//
// assertDirCount
//
Deno.test('MoreAsserts.assertDirCount should verify element count', () => {
    assertDirCount(testdataMoreAssertsFolder, 3)
})
Deno.test('MoreAsserts.assertDirCount should throw when folder does not exist', () => {
    assertThrows(
        () => {
            assertDirCount(TestHelper.folderThatDoesNotExist, 1)
        },
        Deno.errors.NotFound,
        'this-folder-does-not-exist',
    )
})
//
// assertDirCountGreaterOrEqualTo
//
Deno.test('MoreAsserts.assertDirCountGreaterOrEqualTo should verify element count', () => {
    assertDirCountGreaterOrEqualTo(testdataMoreAssertsFolder, 3)
})
//
// assertFileSize
//
Deno.test('MoreAsserts.assertFileSize should check file size', () => {
    assertFileSizeAprox(testdataMoreAssertsFile, 29)
})
Deno.test('MoreAsserts.assertFileSize should throw if file size doesnt match', () => {
    assertThrows(
        () => {
            assertFileSizeAprox(testdataMoreAssertsFile, 10)
        },
        AssertionError,
        'Values are not equal',
    )
})
//
// assertFileDoesNotExist
//
Deno.test('MoreAsserts.assertFileDoesNotExist should identify that file does not exist', () => {
    assertPathDoesNotExist(TestHelper.fileThatDoesNotExist)
})
Deno.test('MoreAsserts.assertFileDoesNotExist should raise when file exists', () => {
    const filePath = testdataMoreAssertsFile

    assertThrows(
        () => {
            assertPathDoesNotExist(filePath)
        },
        AssertionError,
        `Path ${filePath} should not exist`
    )
})
//
// assertPathEndsWith
//
Deno.test('MoreAsserts.assertPathEndsWith should work with Windows path separators', () => {
    assertPathEndsWith('C:\\src\\dev-env\\levain\\testdata\\any-folder\\any-file.txt', 'any-folder\\any-file.txt')
})
Deno.test('MoreAsserts.assertPathEndsWith should work with Posix path separators', () => {
    assertPathEndsWith('/levain/testdata/any-folder/any-file.txt', 'any-folder/any-file.txt')
})
Deno.test('MoreAsserts.assertPathEndsWith should work with mixed path separators', () => {
    assertPathEndsWith('C:\\src\\dev-env\\levain\\testdata\\any-folder\\any-file.txt', 'any-folder/any-file.txt')
    assertPathEndsWith('/levain/testdata/any-folder/any-file.txt', 'any-folder\\any-file.txt')
})
Deno.test('MoreAsserts.assertPathEndsWith should fail for different paths', () => {
    assertThrows(
        () => {
            assertPathEndsWith('one-folder/one-file.txt', 'another-folder/another-file.txt')
        },
        Error,
        'Expected path one-folder/one-file.txt to end with another-folder/another-file.txt'
    )
})
//
// assertNumberEquals
//
Deno.test('MoreAsserts.assertNumberEquals should have a tolerance', () => {
    assertNumberEquals(600, 615, 0.1)
})
Deno.test('MoreAsserts.assertNumberEquals should throw when diff is above tolerance', () => {
    assertThrows(
        () => {
            assertNumberEquals(100, 1000, 0.01)
        }
    )
})
Deno.test('MoreAsserts.assertNumberEquals should work with zeros', () => {
    assertNumberEquals(0, 0)
})
//
// assertGreaterThan
//
Deno.test('MoreAsserts.assertGreaterThan should work with numbers', () => {
    assertGreaterThan(4, 1)
})
Deno.test('MoreAsserts.assertGreaterThan should fail with a message', () => {
    assertThrows(
        () => {
            assertGreaterThan(2, 2000)
        },
        Error,
        'Expected 2 to be greater than 2000'
    )
})
Deno.test('MoreAsserts.assertGreaterThan should fail with custom message', () => {
    assertThrows(
        () => {
            assertGreaterThan(1, 321, 'Do or do not, there is no try')
        },
        Error,
        'Do or do not, there is no try'
    )
})
//
// assertGreaterOrEqualTo
//
Deno.test('MoreAsserts.assertGreaterOrEqualTo should work with numbers', () => {
    assertGreaterOrEqualTo(12, 12)
})
Deno.test('MoreAsserts.assertGreaterOrEqualTo should fail with a message', () => {
    assertThrows(
        () => {
            assertGreaterOrEqualTo(2, 2000)
        },
        Error,
        'Expected 2 to be greater or equal to 2000'
    )
})
Deno.test('MoreAsserts.assertGreaterOrEqualTo should fail with custom message', () => {
    assertThrows(
        () => {
            assertGreaterOrEqualTo(1, 321, 'Always in motion is the future.')
        },
        Error,
        'Always in motion is the future.',
    )
})
