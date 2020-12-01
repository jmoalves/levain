import {AssertionError, assertThrows} from "https://deno.land/std/testing/asserts.ts";
import {assertFind, assertNotFind, assertStringEndsWith} from "./more_asserts.ts";

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