import TestHelper from "./test_helper.ts";
import {assertPathEndsWith} from "./more_asserts.ts";

//
// getTestDataPath
//
Deno.test('TestHelper.getTestDataPath should return testdata path', () => {
    const testdataPath = TestHelper.getTestDataPath()

    assertPathEndsWith(testdataPath, '/levain/testdata')
})
Deno.test('TestHelper.getTestDataPath should return testdata with aditionalPath', () => {
    const testdataPath = TestHelper.getTestDataPath('any-folder/any-file.txt')

    assertPathEndsWith(testdataPath, '/levain/testdata/any-folder/any-file.txt')
})
