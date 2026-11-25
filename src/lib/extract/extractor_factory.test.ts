import * as path from "@std/path";
import { assert, assertEquals, assertThrows } from "@std/assert";
import { stub } from "@std/testing/mock";

import OsUtils from "../os/os_utils.ts";
import ExtraBin from "../paths/extra_bin.ts";
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

Deno.test("ExtractorFactory.createExtractor should default .zip to DenoZip and route .7z/.tar.gz properly", () => {
  const factory = new ExtractorFactory();
  const config = TestHelper.getConfig();

  // Small or unstated .zip defaults to streaming DenoZip on all platforms
  assert(factory.createExtractor(config, "archive.zip") instanceof DenoZip);
  assert(factory.createExtractor(config, "testdata/extract/test.zip") instanceof DenoZip);

  assert(factory.createExtractor(config, "archive.7z") instanceof SevenZip);
  assert(factory.createExtractor(config, "installer.7z.exe") instanceof SevenZip);
  assert(factory.createExtractor(config, "bundle.tar.gz") instanceof UnTar);
  assert(factory.createExtractor(config, "bundle.tgz") instanceof UnTar);
});

Deno.test("ExtractorFactory.createExtractor should use SevenZip on Windows only for large .zip when 7z.exe is present", () => {
  const factory = new ExtractorFactory();
  const config = TestHelper.getConfig();
  const fakeSevenZipDir = TestHelper.getNewTempDir();
  const fakeSevenZipExe = path.join(fakeSevenZipDir, "7z.exe");
  Deno.writeTextFileSync(fakeSevenZipExe, "");

  const origDesc = Object.getOwnPropertyDescriptor(ExtraBin, "sevenZipDir")!;
  const isWinStub = stub(OsUtils, "isWindows", () => true);

  try {
    // Missing 7z.exe -> DenoZip even on Windows
    const emptyDir = TestHelper.getNewTempDir();
    Object.defineProperty(ExtraBin, "sevenZipDir", { get: () => emptyDir, configurable: true });
    assert(factory.createExtractor(config, "big.zip") instanceof DenoZip);

    // Existing 7z.exe, but archive does not exist / stat fails -> DenoZip
    Object.defineProperty(ExtraBin, "sevenZipDir", { get: () => fakeSevenZipDir, configurable: true });
    assert(factory.createExtractor(config, "nonexistent.zip") instanceof DenoZip);

    // Existing 7z.exe + archive >= LARGE_ZIP_THRESHOLD_BYTES -> SevenZip
    const statStub = stub(Deno, "statSync", () => ({
      size: ExtractorFactory.LARGE_ZIP_THRESHOLD_BYTES,
    } as Deno.FileInfo));
    try {
      assert(factory.createExtractor(config, "large.zip") instanceof SevenZip);
    } finally {
      statStub.restore();
    }

    // Existing 7z.exe + archive < LARGE_ZIP_THRESHOLD_BYTES -> DenoZip
    const smallStatStub = stub(Deno, "statSync", () => ({
      size: ExtractorFactory.LARGE_ZIP_THRESHOLD_BYTES - 1,
    } as Deno.FileInfo));
    try {
      assert(factory.createExtractor(config, "small.zip") instanceof DenoZip);
    } finally {
      smallStatStub.restore();
    }
  } finally {
    Object.defineProperty(ExtraBin, "sevenZipDir", origDesc);
    isWinStub.restore();
  }
});

Deno.test("ExtractorFactory.createExtractor should respect explicit type override", () => {
  const factory = new ExtractorFactory();
  const config = TestHelper.getConfig();

  assert(factory.createExtractor(config, "archive_without_ext", "7z") instanceof SevenZip);
  assert(factory.createExtractor(config, "archive_without_ext", "tgz") instanceof UnTar);
});

Deno.test("ExtractorFactory.createExtractor should throw Error on unsupported type or unknown extension", () => {
  const factory = new ExtractorFactory();
  const config = TestHelper.getConfig();

  assertThrows(
    () => factory.createExtractor(config, "archive.zip", "rar"),
    Error,
    "archive.zip - file not supported (1).",
  );
  assertThrows(
    () => factory.createExtractor(config, "archive.unknown"),
    Error,
    "archive.unknown - file not supported (2).",
  );
});
