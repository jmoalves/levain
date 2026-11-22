import { assert, assertEquals, assertThrows } from "@std/assert";

import OsUtils from "../os/os_utils.ts";
import TestHelper from "../test/test_helper.ts";
import { DenoZip } from "./denozip_extractor.ts";
import { ExtractorFactory } from "./extractor_factory.ts";
import { SevenZip } from "./sevenzip_extractor.ts";
import { UnTar } from "./untar_extractor.ts";

Deno.test("ExtractorFactory.isTypeSupported should accept supported archive types case-insensitively", () => {
  const factory = new ExtractorFactory();

  for (const valid of ["zip", "ZIP", "7z", "7z.exe", "tar.gz", "tgz", "TGZ"]) {
    assertEquals(factory.isTypeSupported(valid), true, `expected ${valid} to be supported`);
  }

  for (const invalid of ["rar", "bz2", "", undefined]) {
    assertEquals(factory.isTypeSupported(invalid), false, `expected ${invalid} to be unsupported`);
  }
});

Deno.test("ExtractorFactory.createExtractor should choose extractor by file extension", () => {
  const factory = new ExtractorFactory();
  const config = TestHelper.getConfig();

  const zipExtractor = factory.createExtractor(config, "archive.zip");
  if (OsUtils.isWindows()) {
    assert(zipExtractor instanceof SevenZip);
  } else {
    assert(zipExtractor instanceof DenoZip);
  }

  assert(factory.createExtractor(config, "archive.7z") instanceof SevenZip);
  assert(factory.createExtractor(config, "installer.7z.exe") instanceof SevenZip);
  assert(factory.createExtractor(config, "bundle.tar.gz") instanceof UnTar);
  assert(factory.createExtractor(config, "bundle.tgz") instanceof UnTar);
});

Deno.test("ExtractorFactory.createExtractor should respect explicit type override", () => {
  const factory = new ExtractorFactory();
  const config = TestHelper.getConfig();

  assert(factory.createExtractor(config, "archive_without_ext", "7z") instanceof SevenZip);
  assert(factory.createExtractor(config, "archive_without_ext", "tgz") instanceof UnTar);
});

Deno.test("ExtractorFactory.createExtractor should throw on unsupported type or unknown extension", () => {
  const factory = new ExtractorFactory();
  const config = TestHelper.getConfig();

  assertThrows(
    () => factory.createExtractor(config, "archive.zip", "rar"),
    "archive.zip - file not supported (1).",
  );
  assertThrows(
    () => factory.createExtractor(config, "archive.unknown"),
    "archive.unknown - file not supported (2).",
  );
});
