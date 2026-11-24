import * as path from "@std/path";
import { assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
import { SevenZip } from "./sevenzip_extractor.ts";
import TestHelper from "../test/test_helper.ts";
import { assertFolderIncludes } from "../test/more_asserts.ts";
import OsUtils from "../os/os_utils.ts";
import ExtraBin from "../paths/extra_bin.ts";

Deno.test("SevenZip.extractImpl should pass argv array directly to OsUtils.runAndLog", async () => {
  const calls: (string | string[])[] = [];
  const winStub = stub(OsUtils, "onlyInWindows", () => {});
  const runStub = stub(OsUtils, "runAndLog", (cmd: string | string[]) => {
    calls.push(cmd);
    return Promise.resolve("");
  });

  try {
    const extractor = new SevenZip(TestHelper.getConfig());
    await extractor.extractImpl("C:\\my archives\\test file.7z", "C:\\out dir\\dest");

    assertEquals(calls, [[
      path.join(ExtraBin.sevenZipDir, "7z.exe"),
      "x",
      "-bsp2",
      "-aoa",
      "-oC:\\out dir\\dest",
      "--",
      "C:\\my archives\\test file.7z",
    ]]);
  } finally {
    runStub.restore();
    winStub.restore();
  }
});

if (OsUtils.isWindows()) {
  // TODO implement for Posix
  Deno.test("SevenZip should extract a zip file into a destination containing spaces", async () => {
    // Given
    const config = TestHelper.getConfig();
    const extractor = new SevenZip(config);
    const zipFile = "testdata/extract/test.zip";
    const tempDir = path.join(TestHelper.getNewTempDir(), "dir with spaces");
    // When
    await extractor.extractImpl(zipFile, tempDir);
    // Then
    assertFolderIncludes(tempDir, ["test/abc.txt", "test/hello.txt"]);
  });
}
