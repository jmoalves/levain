import {SevenZip} from "./sevenzip_extractor.ts";
import TestHelper from "../test/test_helper.ts";
import {assertFolderIncludes} from "../test/more_asserts.ts";
import OsUtils from "../os/os_utils.ts";

if (OsUtils.isWindows()) {
    // TODO implement for Posix
    Deno.test('SevenZip should extract a zip file', async () => {
        // Given
        const config = TestHelper.getConfig()
        const extractor = new SevenZip(config)
        const zipFile = 'testdata/extract/test.zip'
        const tempDir = TestHelper.getNewTempDir()
        // When
        await extractor.extractImpl(zipFile, tempDir)
        // Then
        assertFolderIncludes(tempDir, ['test/abc.txt', 'test/hello.txt'])
    })
}
