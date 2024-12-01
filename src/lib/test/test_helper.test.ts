import { assert, assertEquals } from "jsr:@std/assert";

import TestHelper from "./test_helper.ts";
import { RegExpOptions } from "./test_helper.ts";
import { assertPathEndsWith } from "./more_asserts.ts";

Deno.test('TestHelper.getTestDataPath should return testdata path', () => {
    const testdataPath = TestHelper.getTestDataPath()

    assertPathEndsWith(testdataPath, '/levain/testdata')
})

Deno.test('TestHelper.getTestDataPath should return testdata with aditionalPath', () => {
    const testdataPath = TestHelper.getTestDataPath('any-folder/any-file.txt')

    assertPathEndsWith(testdataPath, '/levain/testdata/any-folder/any-file.txt')
})

Deno.test('TestHelper.pathRegExp', () => {
    assertPathRegExp('D:\\src\\github\\levain', /D:\\src\\github\\levain/)
    assertPathRegExp('D:\\src\\github\\levain', /D:\\src\\github\\levain/i, { ignoreCase: true })
    assertPathRegExp('D:\\src\\github\\levain', /D:\\src\\github\\levain/, { ignoreCase: false })

    assertPathRegExp('/home/SRC/github/levain', /\/home\/SRC\/github\/levain/)
    assertPathRegExp('/home/src/github/levain', /\/home\/src\/github\/levain/i, { ignoreCase: true })
})

function assertPathRegExp(path: string, expectedRegexp: RegExp, options?: RegExpOptions) {
    assert(path.match(expectedRegexp), "expected regexp does not match")

    const actualRegexp = TestHelper.pathRegExp(path, options)
    assertEquals(actualRegexp, expectedRegexp)
    assert(path.match(actualRegexp), "actual regexp does not match") // Redundant
}
