import { DenoZip } from "./denozip_extractor.ts";
import TestHelper from "../test/test_helper.ts";
import { assertFolderIncludes } from "../test/more_asserts.ts";

Deno.test("DenoZip should extract a zip file", async () => {
  // Given
  const config = TestHelper.getConfig();
  const extractor = new DenoZip(config);
  const zipFile = "testdata/extract/test.zip";
  const tempDir = TestHelper.getNewTempDir();
  // When
  await extractor.extractImpl(zipFile, tempDir);
  // Then
  assertFolderIncludes(tempDir, ["test/abc.txt", "test/hello.txt"]);
});
