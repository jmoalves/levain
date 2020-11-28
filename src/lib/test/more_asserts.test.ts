import {AssertionError, assertThrows} from "https://deno.land/std/testing/asserts.ts";
import {assertStringEndsWith} from "./more_asserts.ts";

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
