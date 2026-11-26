import { assert, assertEquals, assertThrows } from "@std/assert";
import * as path from "@std/path";
import { ensureDirSync } from "@std/fs";
import { stub } from "@std/testing/mock";

import { FileUtils } from "../fs/file_utils.ts";
import FileSystemPackage from "./file_system_package.ts";
import TestHelper from "../test/test_helper.ts";

//
// skipRegistry
//
Deno.test("should not skipRegistry if not declared", () => {
  const pkg = TestHelper.getTestPkg("");

  assertEquals(pkg.skipRegistry(), false);
});
Deno.test("should skipRegistry", () => {
  const pkg = TestHelper.getTestPkg(
    "levain.pkg.skipRegistry: true",
  );

  assertEquals(pkg.skipRegistry(), true);
});
Deno.test("should not skipRegistry", () => {
  const pkg = TestHelper.getTestPkg(
    "levain.pkg.skipRegistry: false",
  );

  assertEquals(pkg.skipRegistry(), false);
});
//
// skipInstallDir
//
Deno.test("should not skipInstallDir if not declared", () => {
  const pkg = TestHelper.getTestPkg("");

  assertEquals(pkg.skipInstallDir(), false);
});
Deno.test("should skipInstallDir", () => {
  const pkg = TestHelper.getTestPkg(
    "levain.pkg.skipInstallDir: true",
  );

  assertEquals(pkg.skipInstallDir(), true);
});
Deno.test("should not skipInstallDir", () => {
  const pkg = TestHelper.getTestPkg(
    "levain.pkg.skipInstallDir: false",
  );

  assertEquals(pkg.skipInstallDir(), false);
});

Deno.test("FileSystemPackage.updateAvailable should lazily compare identical, comment-different, self-registry, and updated recipes", () => {
  const config = TestHelper.getConfig();
  const regDir = config.configPaths.levainRegistryDir;
  const srcDir = TestHelper.getNewTempDir();
  ensureDirSync(regDir);

  const yamlV1 = "version: 1.0.0\ncmd.env:\n  - setEnv A 1\n";
  const yamlV1WithComment = "# comment only\nversion: 1.0.0\ncmd.env:\n  - setEnv A 1\n";
  const yamlV2 = "version: 2.0.0\ncmd.env:\n  - setEnv A 2\n";

  const regFile = path.join(regDir, "demo.levain.yaml");
  const srcFile = path.join(srcDir, "demo.levain.yaml");

  // Not installed -> updateAvailable = true
  const pkgNotInstalled = new FileSystemPackage(config, "demo", path.join(config.configPaths.levainHome, "demo"), srcFile, yamlV1);
  assertEquals(pkgNotInstalled.installed, false);
  assertEquals(pkgNotInstalled.updateAvailable, true);
  // Second access hits memoized value
  assertEquals(pkgNotInstalled.updateAvailable, true);

  Deno.writeTextFileSync(regFile, yamlV1);

  // Registry package pointing to itself -> fast path false
  const pkgSelf = new FileSystemPackage(config, "demo", path.join(config.configPaths.levainHome, "demo"), regFile, yamlV1);
  assertEquals(pkgSelf.installed, true);
  assertEquals(pkgSelf.updateAvailable, false);

  // Identical YAML string -> fast path false without reparsing
  const pkgSame = new FileSystemPackage(config, "demo", path.join(config.configPaths.levainHome, "demo"), srcFile, yamlV1);
  assertEquals(pkgSame.updateAvailable, false);

  // Semantically equal YAML with comment difference -> fallback parse returns false
  const pkgComment = new FileSystemPackage(config, "demo", path.join(config.configPaths.levainHome, "demo"), srcFile, yamlV1WithComment);
  assertEquals(pkgComment.updateAvailable, false);

  // Updated version -> returns true
  const pkgUpdated = new FileSystemPackage(config, "demo", path.join(config.configPaths.levainHome, "demo"), srcFile, yamlV2);
  assertEquals(pkgUpdated.updateAvailable, true);

  // If registry file disappears before lazy updateAvailable read -> returns true gracefully instead of throwing
  const pkgDisappearing = new FileSystemPackage(config, "demo", path.join(config.configPaths.levainHome, "demo"), srcFile, yamlV1);
  Deno.removeSync(regFile);
  assertEquals(pkgDisappearing.updateAvailable, true);

  // Timestamps and non-NotFound read errors in updateAvailable
  Deno.writeTextFileSync(srcFile, yamlV1);
  Deno.writeTextFileSync(regFile, yamlV1);
  const pkgTs = new FileSystemPackage(config, "demo", path.join(config.configPaths.levainHome, "demo"), srcFile, yamlV1);
  assert(pkgTs.getRecipeTimestamp() instanceof Date);
  assert(pkgTs.getInstalledTimestamp() instanceof Date);

  const permStub = stub(FileUtils, "readTextFileSync", () => {
    throw new Deno.errors.PermissionDenied("denied");
  });
  try {
    assertThrows(() => pkgTs.updateAvailable, Deno.errors.PermissionDenied);
  } finally {
    permStub.restore();
  }
});

Deno.test("FileSystemPackage warns on unknown reserved levain.* YAML keys without warning on official directives", async () => {
  const logger = await TestHelper.setupTestLogger();
  const config = TestHelper.getConfig();
  const baseDir = TestHelper.getNewTempDir();

  // Official directives (both flat and nested under `levain:`) must NOT trigger unknown-key warnings
  new FileSystemPackage(
    config,
    "valid-pkg",
    baseDir,
    path.join(baseDir, "valid-pkg.levain.yaml"),
    [
      "version: 1.0.0",
      "levain:",
      "  minVersion: 1.0.0",
      "  pkg:",
      "    skipInstallDir: true",
      "levain.pkg.skipRegistry: false",
      "levain.preserveBaseDirOnUpdate: true",
      "levain.var.default.sample: ok",
    ].join("\n"),
  );
  assertEquals(logger.messages.filter((m) => m.startsWith("WARN")).length, 0);

  // Unknown or mis-cased reserved keys (flat and nested under `levain:`) trigger warnings
  new FileSystemPackage(
    config,
    "typo-pkg",
    baseDir,
    path.join(baseDir, "typo-pkg.levain.yaml"),
    [
      "version: 1.0.0",
      "levain:",
      "  MinVersion: 1.0.0",
      "  typo: true",
      "LeVaIn.Pkg.SkipInstalDir: true",
      "LEVAIN_CUSTOM: 123",
      "_LEVAIN_OLD_PROMPT: hack",
      "levainHome: /fake",
    ].join("\n"),
  );
  const warns = logger.messages.filter((m) => m.startsWith("WARN"));
  assertEquals(warns.length, 6);
  assert(warns[0].includes("levain.MinVersion"));
  assert(warns[1].includes("levain.typo"));
  assert(warns[2].includes("LeVaIn.Pkg.SkipInstalDir"));
  assert(warns[3].includes("LEVAIN_CUSTOM"));
  assert(warns[4].includes("_LEVAIN_OLD_PROMPT"));
  assert(warns[5].includes("levainHome"));

  // Reserved package name (case-insensitive) omits implicit levain dependency
  const reservedPkg = new FileSystemPackage(
    config,
    "LeVaIn",
    baseDir,
    path.join(baseDir, "LeVaIn.levain.yaml"),
    "version: 1.0.0\ndependencies:\n  - other\n",
  );
  assertEquals(reservedPkg.dependencies, undefined);
});
