import HttpUtils from "./http_utils.ts"
import * as path from "https://deno.land/std/path/mod.ts"
import {assertEquals} from "https://deno.land/std/assert/mod.ts"

//
// resolve
//
Deno.test('HttpUtils.resolve should resolve file paths', () => {
    assertEquals(HttpUtils.resolve('.'), path.resolve('.'))
})
Deno.test('HttpUtils.resolve should not change urls', () => {
    assertEquals(HttpUtils.resolve('http://google.com'), 'http://google.com')
})
