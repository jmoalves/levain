import HttpUtils from "./http_utils.ts"
import * as path from "jsr:@std/path"
import {assertEquals} from "jsr:@std/assert"

//
// resolve
//
Deno.test('HttpUtils.resolve should resolve file paths', () => {
    assertEquals(HttpUtils.resolve('.'), path.resolve('.'))
})
Deno.test('HttpUtils.resolve should not change urls', () => {
    assertEquals(HttpUtils.resolve('http://google.com'), 'http://google.com')
})
