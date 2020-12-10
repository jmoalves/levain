import DirUtils from "./dir_utils.ts";
import {assertArrayIncludes} from "https://deno.land/std/testing/asserts.ts";

Deno.test('should list file names', () => {
    const fileNames = DirUtils.listFileNames('./testdata/extract')
    assertArrayIncludes(fileNames, [
        "testdata/extract",
        "testdata/extract/test",
        "testdata/extract/test/abc.txt",
        "testdata/extract/test/hello.txt",
        "testdata/extract/test.zip",
    ])
})
