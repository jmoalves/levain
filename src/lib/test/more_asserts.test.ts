import * as path from "https://deno.land/std/path/mod.ts";
import {AssertionError, assertThrows} from "https://deno.land/std/testing/asserts.ts";

import {
    assertArrayContainsInAnyOrder,
    assertArrayEndsWith,
    assertDirCount,
    assertFileDoesNotExist,
    assertFileSizeAprox,
    assertFind,
    assertFolderIncludes,
    assertGreaterThan,
    assertNotFind,
    assertNumberEquals,
    assertStringEndsWith,
} from "./more_asserts.ts";
import TestHelper from "./test_helper.ts";

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
        "expected [1,2,3] to end with [6,7,8]"
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
        `expected ["abc","xyz"] to end with ["abc"]`
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
    assertArrayContainsInAnyOrder([1, 2, 3], [2, 3, 1])
})
Deno.test('MoreAsserts.assertArrayContainsInAnyOrder should find out that one element is missing', () => {
    assertThrows(
        () => {
            assertArrayContainsInAnyOrder([1, 2], [1, 2, 3])
        },
        AssertionError,
    )
})
//
// assertFolderIncludes
//
Deno.test('MoreAsserts.assertFolderIncludes should assert a file is in a folder', () => {
    assertFolderIncludes('testdata/assertFolderIncludes', ['file.txt'])
})
Deno.test('MoreAsserts.assertFolderIncludes should find out that a file is missing', () => {
    assertThrows(
        () => {
            assertFolderIncludes('testdata/assertFolderIncludes', ['abc123.doc'])
        },
        AssertionError,
        "abc123.doc",
    )
})
//
// assertDirCount
//
Deno.test('MoreAsserts.assertDirCount should verify element count', () => {
    assertDirCount('testdata/more_asserts', 3)
})
Deno.test('MoreAsserts.assertDirCount should throw when folder does not exist', () => {
    assertThrows(
        () => {
            assertDirCount(TestHelper.folderThatDoesNotExist, 1)
        },
        Deno.errors.NotFound,
        '(os error 2)',
    )
})
//
// assertFileSize
//
Deno.test('MoreAsserts.assertFileSize should check file size', () => {
    assertFileSizeAprox(path.join('testdata', 'more_asserts', 'file.txt'), 29)
})
Deno.test('MoreAsserts.assertFileSize should throw if file size doesnt match', () => {
    assertThrows(
        () => {
            assertFileSizeAprox(path.join('testdata', 'more_asserts', 'file.txt'), 10)
        },
        AssertionError,
        'Values are not equal',
    )
})
//
// assertFileDoesNotExist
//
Deno.test('MoreAsserts.assertFileDoesNotExist should identify that file does not exist', () => {
    assertFileDoesNotExist(TestHelper.fileThatDoesNotExist)
})
Deno.test('MoreAsserts.assertFileDoesNotExist should raise when file exists', () => {
    const filePath = path.join('testdata', 'more_asserts', 'file.txt')

    assertThrows(
        () => {
            assertFileDoesNotExist(filePath)
        },
        AssertionError,
        `File ${filePath} should not exist`
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
