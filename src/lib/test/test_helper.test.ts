import TestHelper from "./test_helper.ts";
import {assertStringEndsWith} from "./more_asserts.ts";

//
// getTestDataPath
//
Deno.test('TestHelper.getTestDataPath should return testdata path', () => {
    const testDataPath = TestHelper.getTestDataPath()

    assertStringEndsWith(testDataPath, '/levain/testdata')
})
Deno.test('TestHelper.getTestDataPath should return testdata with aditionalPath', () => {
    const testDataPath = TestHelper.getTestDataPath('any-folder/any-file.txt')

    assertStringEndsWith(testDataPath, '/levain/testdata/any-folder/any-file.txt')
})
