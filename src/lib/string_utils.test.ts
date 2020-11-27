import {assertEquals} from "https://deno.land/std/testing/asserts.ts";
import StringUtils from './string_utils.ts';

Deno.test('should check if textContainsChars', () => {
    assertEquals(StringUtils.textContainsAtLeastOneChar('abc', 'xyz'), false)
    assertEquals(StringUtils.textContainsAtLeastOneChar('abc', 'cde'), true)
})
