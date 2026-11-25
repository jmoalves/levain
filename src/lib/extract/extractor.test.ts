import { assertRejects } from "@std/assert";
import * as path from "@std/path";

import TestHelper from "../test/test_helper.ts";
import { assertFolderIncludes } from "../test/more_asserts.ts";
import OsUtils from "../os/os_utils.ts";
import { ExtractorFactory } from "./extractor_factory.ts";
import { Extractor } from "./extractor.ts";

// Workaround - https://github.com/denoland/deno/issues/15425
Deno.test("Extractor should copy srcFile to dstFile", async () => {
  // Given
  const config = TestHelper.getConfig();

  const srcFile = "testdata/extract/test.zip";
  const srcFileName = path.basename(srcFile);

  const factory = new ExtractorFactory();
  const extractor = factory.createExtractor(config, srcFile);

  const dst = TestHelper.getNewTempDir();
  const dstFile = path.join(dst, srcFileName);

  // When
  await extractor.copy(srcFile, dstFile);
  // Then
  assertFolderIncludes(dst, [dstFile]);

  // Workaround - https://github.com/denoland/deno/issues/15425
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Extractor should handle type option", async () => {
  // Given
  const config = TestHelper.getConfig();

  const srcFile = "testdata/extract/test_zip_without_extension";
  const srcFileName = path.basename(srcFile);

  const factory = new ExtractorFactory();
  const extractor = factory.createExtractor(config, srcFile, "zip");

  const dst = TestHelper.getNewTempDir();
  const dstFile = path.join(dst, srcFileName);

  // When
  await extractor.copy(srcFile, dstFile);
  // Then
  assertFolderIncludes(dst, [dstFile]);

  // Workaround - https://github.com/denoland/deno/issues/15425
  await new Promise((resolve) => setTimeout(resolve, 0));
});

Deno.test("Extractor.extractToTemp should clear feedback interval timer when extractImpl throws", async () => {
  class FailingExtractor extends Extractor {
    extractImpl(_src: string, _dst: string): Promise<void> {
      return Promise.reject(new Error("boom during extract"));
    }
  }

  const extractor = new FailingExtractor(TestHelper.getConfig());
  const dst = TestHelper.getNewTempDir();

  await assertRejects(
    async () => {
      await extractor.extractToTemp("dummy.zip", dst);
    },
    Error,
    "boom during extract",
  );
});

Deno.test("Extractor.move with --strip should reject non-directory or symlink root entries", async () => {
  class DummyExtractor extends Extractor {
    extractImpl(_src: string, _dst: string): void {}
  }

  const extractor = new DummyExtractor(TestHelper.getConfig());

  // Regular file as root entry
  const srcWithFile = TestHelper.getNewTempDir();
  const dst1 = TestHelper.getNewTempDir();
  await Deno.writeTextFile(path.join(srcWithFile, "plain.txt"), "not a dir");
  await assertRejects(
    async () => await extractor.move(true, srcWithFile, dst1),
    Error,
    "Unsafe --strip archive root entry",
  );

  // Symlink pointing to external directory (POSIX / elevated Windows)
  if (!OsUtils.isWindows()) {
    const externalDir = TestHelper.getNewTempDir();
    await Deno.writeTextFile(path.join(externalDir, "secret.txt"), "outside");
    const srcWithSymlink = TestHelper.getNewTempDir();
    const dst2 = TestHelper.getNewTempDir();
    await Deno.symlink(externalDir, path.join(srcWithSymlink, "escape-link"));

    await assertRejects(
      async () => await extractor.move(true, srcWithSymlink, dst2),
      Error,
      "Unsafe --strip archive root entry",
    );
  }
});
