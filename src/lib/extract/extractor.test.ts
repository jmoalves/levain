import * as path from "jsr:@std/path";

// Workaround - https://github.com/denoland/deno/issues/15425
Deno.test('Extractor should copy srcFile to dstFile', async () => {
    // Given
    const config = TestHelper.getConfig()

    const srcFile = 'testdata/extract/test.zip'
    const srcFileName = path.basename(srcFile)

    const factory = new ExtractorFactory()
    const extractor = factory.createExtractor(config, srcFile)

    const dst = TestHelper.getNewTempDir()
    const dstFile = path.join(dst, srcFileName)

    // When
    await extractor.copy(srcFile, dstFile)
    // Then
    assertFolderIncludes(dst, [dstFile])

    // Workaround - https://github.com/denoland/deno/issues/15425
    await new Promise((resolve) => setTimeout(resolve, 0));
})

Deno.test('Extractor should handle type option', async () => {
    // Given
    const config = TestHelper.getConfig()

    const srcFile = 'testdata/extract/test_zip_without_extension'
    const srcFileName = path.basename(srcFile)

    const factory = new ExtractorFactory()
    const extractor = factory.createExtractor(config, srcFile, 'zip')

    const dst = TestHelper.getNewTempDir()
    const dstFile = path.join(dst, srcFileName)

    // When
    await extractor.copy(srcFile, dstFile)
    // Then
    assertFolderIncludes(dst, [dstFile])

    // Workaround - https://github.com/denoland/deno/issues/15425
    await new Promise((resolve) => setTimeout(resolve, 0));
})
