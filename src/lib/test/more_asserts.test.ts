import {AssertionError, assertThrows} from "https://deno.land/std/testing/asserts.ts";
import {
    assertArrayContainsInAnyOrder,
    assertArrayEndsWith,
    assertFind,
    assertFolderIncludes,
    assertNotFind,
    assertStringEndsWith
} from "./more_asserts.ts";

//
// assertsStringEndsWith
//
Deno.test('should raise error when string doesnt end the expected way', () => {
    assertThrows(
        () => {
            assertStringEndsWith('abc', 'yz')
        },
        AssertionError,
        'Expected "abc" to end with "yz"'
    )
})

Deno.test('should raise error when string doesnt end the expected way', () => {
    assertStringEndsWith('supercalifragilisticexpialidocious', 'docious')
})
//
// assertArrayEndsWith
//
Deno.test('should raise error when arrays are completly different', () => {
    assertThrows(
        () => {
            assertArrayEndsWith([1, 2, 3], [6, 7, 8])
        },
        AssertionError,
        "expected [1,2,3] to end with [6,7,8]"
    )
})
Deno.test('should detect numeric array ending', () => {
    assertArrayEndsWith([1, 2, 3], [2, 3])
})
Deno.test('should raise error when string array ends are different', () => {
    assertThrows(
        () => {
            assertArrayEndsWith(['abc', 'xyz'], ['abc'])
        },
        AssertionError,
        `expected ["abc","xyz"] to end with ["abc"]`
    )
})
Deno.test('should detect string array ending', () => {
    assertArrayEndsWith(['abc', '123', 'do re mi'], ['123', 'do re mi'])
})
//
// assertFind
//
Deno.test('should find and assert', () => {
    assertFind([1, 2, 3], it => it === 2)
})

Deno.test('should throw AssertionError when nothing is found', () => {
    assertThrows(
        () => assertFind([1, 2, 3], it => it === 3.1416),
        AssertionError,
        'Could\'t find expected element',
    )
})
//
// asserNotFind
//
Deno.test('should not find and assert', () => {
    assertNotFind([1, 2, 3], it => it === 3.1416)
})

Deno.test('should throw AssertionError when element is found', () => {
    assertThrows(
        () => assertNotFind([1, 2, 3], it => it === 2),
        AssertionError,
        'Shouldn\'t be able to find element',
    )
})
//
// assertArrayContainsInAnyOrder
//
Deno.test('should assert that elements are equal, even in different order', () => {
    assertArrayContainsInAnyOrder([1, 2, 3], [2, 3, 1])
})
Deno.test('should find out that one element is missing', () => {
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
Deno.test('should assert a file is in a folder', () => {
    assertFolderIncludes('testdata/assertFolderIncludes', ['file.txt'])
})
Deno.test('should find out that a file is missing', () => {
    assertThrows(
        () => {
            assertFolderIncludes('testdata/assertFolderIncludes', ['abc123.doc'])
        },
        AssertionError,
        "abc123.doc",
    )
})
