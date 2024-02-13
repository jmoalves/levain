import * as path from "https://deno.land/std/path/mod.ts";

import TestHelper from "../test/test_helper.ts";
import {assertFolderIncludes} from "../test/more_asserts.ts";
import {DenoZip} from "./denozip_extractor.ts";

// Workaround - https://github.com/denoland/deno/issues/15425
Deno.test('Extractor should copy srcFile to dstFile', async () => {
    // Given
    const extractor = getExtractor();
    const srcFile = 'testdata/extract/test.zip'
    const srcFileName = path.basename(srcFile)
    const dst = TestHelper.getNewTempDir()
    const dstFile = path.join(dst, srcFileName)
    // When
    await extractor.copy(srcFile, dstFile)
    // Then
    assertFolderIncludes(dst, [dstFile])

    // Workaround - https://github.com/denoland/deno/issues/15425
    await new Promise((resolve) => setTimeout(resolve, 0));
})

function getExtractor() {
    const config = TestHelper.getConfig()
    const extractor = new DenoZip(config)
    return extractor;
}
