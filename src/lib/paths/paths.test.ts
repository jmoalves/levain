import * as path from "@std/path";
import { existsSync } from "@std/fs";
import { assert, assertEquals, assertFalse, assertThrows } from "@std/assert";
import { stub } from "@std/testing/mock";

import TestHelper from "../test/test_helper.ts";
import ConfigPaths from "./config_paths.ts";
import ExtraBin from "./extra_bin.ts";
import GeneralPaths from "./general_paths.ts";
import HomePaths from "./home_paths.ts";
import LevainPaths from "./levain_paths.ts";

Deno.test("LevainPaths should resolve project root, recipes dir, and levain recipe file", () => {
  assertEquals(path.basename(LevainPaths.levainRootFile), "levain.ts");
  assertEquals(LevainPaths.levainSrcDir, path.resolve(LevainPaths.levainRootDir));
  assertEquals(LevainPaths.levainRecipesDir, path.resolve(LevainPaths.levainSrcDir, "recipes"));
  assertEquals(LevainPaths.levainRecipePath, path.resolve(LevainPaths.levainRecipesDir, "levain.levain.yaml"));
  assert(existsSync(LevainPaths.levainRecipePath), "levain.levain.yaml should exist");

  const execPath = path.resolve("/opt/levain/build/levain.exe");
  const bundlePath = path.resolve("/opt/levain/build/levain.bundle.js");
  const bundleUrl = path.toFileUrl(bundlePath).href;
  const sourcePath = path.resolve("/opt/levain/src/lib/paths/levain_paths.ts");
  const sourceUrl = path.toFileUrl(sourcePath).href;

  assertEquals(
    LevainPaths.resolveRootFile(["--is_compiled_binary", "list"], execPath, sourceUrl),
    execPath,
  );
  assertEquals(
    LevainPaths.resolveRootFile(["--is_bundled_js", "list"], execPath, bundleUrl),
    bundlePath,
  );
  assertEquals(
    LevainPaths.resolveRootFile(["list"], execPath, sourceUrl),
    path.resolve("/opt/levain/levain.ts"),
  );
});

Deno.test("ConfigPaths should resolve standard directories purely without creating them on disk", () => {
  const tempHome = TestHelper.getNewTempDir();
  const cp = new ConfigPaths(tempHome);

  assertEquals(cp.levainBaseDir, path.resolve(tempHome, "levain"));
  assertEquals(cp.levainConfigDir, path.resolve(tempHome, ".levain"));
  assertFalse(existsSync(cp.levainConfigDir));
  assertEquals(cp.oldLevainConfigFile, path.resolve(cp.levainConfigDir, "config.json"));
  assertEquals(cp.levainRegistryDir, path.resolve(cp.levainConfigDir, "registry"));
  assertFalse(existsSync(cp.levainRegistryDir));
  assertEquals(cp.levainSafeTempDir, path.resolve(cp.levainConfigDir, "temp"));
  assertFalse(existsSync(cp.levainSafeTempDir));
  assertEquals(cp.levainBackupDir, path.resolve(cp.levainConfigDir, "backup"));
  assertFalse(existsSync(cp.levainBackupDir));
  assertEquals(cp.levainCacheDir, path.resolve(tempHome, ".levainCache"));
  assertFalse(existsSync(cp.levainCacheDir));
  assertEquals(cp.levainHookPath, path.join(cp.levainConfigDir, "levain-hook.cmd"));
  assertEquals(cp.levainLockPath, path.join(cp.levainConfigDir, "levain.lock"));

  // Custom setters override default backup/cache locations without filesystem side effects
  const customBackup = path.join(tempHome, "custom-backup");
  const customCache = path.join(tempHome, "custom-cache");
  cp.levainBackupDir = customBackup;
  cp.levainCacheDir = customCache;
  assertEquals(cp.levainBackupDir, customBackup);
  assertEquals(cp.levainCacheDir, customCache);
  assertFalse(existsSync(customBackup));
  assertFalse(existsSync(customCache));
});

Deno.test("HomePaths.homedir should follow HOME -> userprofile -> homedrive+homepath -> throw", () => {
  const envMap: Record<string, string | undefined> = {};
  const envStub = stub(Deno.env, "get", (key: string) => envMap[key]);

  try {
    envMap.HOME = "/mock/home";
    assertEquals(HomePaths.homedir(), "/mock/home");
    assertEquals(HomePaths.levainConfigFile, path.resolve("/mock/home", "levain.config.json"));
    assertEquals(HomePaths.levainFallbackHome, path.resolve("/mock/home", "levain"));
    assertEquals(HomePaths.levainLog, path.resolve("/mock/home", "levain.log"));
    assertEquals(HomePaths.levainYaml, path.resolve("/mock/home", ".levain.yaml"));
    assertEquals(HomePaths.desktopDir, path.resolve("/mock/home", "Desktop"));
    assertEquals(
      HomePaths.startMenuDir,
      path.resolve("/mock/home", "AppData/Roaming/Microsoft/Windows/Start Menu/Programs"),
    );
    assertEquals(HomePaths.startupDir, path.resolve(HomePaths.startMenuDir, "Startup"));
    assertEquals(HomePaths.profileCandidates(), [
      path.join("/mock/home", ".bashrc"),
      path.join("/mock/home", ".bash_profile"),
      path.join("/mock/home", ".profile"),
    ]);
    assertEquals(HomePaths.profileCandidates("/other"), [
      path.join("/other", ".bashrc"),
      path.join("/other", ".bash_profile"),
      path.join("/other", ".profile"),
    ]);

    envMap.HOME = undefined;
    envMap.userprofile = "/mock/userprofile";
    assertEquals(HomePaths.homedir(), "/mock/userprofile");

    envMap.userprofile = undefined;
    envMap.homedrive = "/mock/drive";
    envMap.homepath = "users/test";
    assertEquals(HomePaths.homedir(), path.resolve("/mock/drive", "users/test"));

    envMap.homedrive = undefined;
    envMap.homepath = undefined;
    assertThrows(() => HomePaths.homedir(), "No home for levain. Do you have a refrigerator?");
  } finally {
    envStub.restore();
  }
});

Deno.test("GeneralPaths should resolve mvnCliPath and tempDir fallback chain", () => {
  const envMap: Record<string, string | undefined> = {};
  const envStub = stub(Deno.env, "get", (key: string) => envMap[key]);

  try {
    assertThrows(() => GeneralPaths.mvnCliPath(), "M2_HOME not found");

    envMap.M2_HOME = "/opt/maven";
    assertEquals(GeneralPaths.mvnCliPath(), path.resolve("/opt/maven", "bin", "mvn"));
    // TODO(phase-4.5): GeneralPaths.mvnCliPath currently ignores the suffix text and always appends ".cmd".
    assertEquals(GeneralPaths.mvnCliPath(".sh"), path.resolve("/opt/maven", "bin", "mvn") + ".cmd");

    assertEquals(GeneralPaths.tempDir, "/tmp");
    assertEquals(GeneralPaths.tempLevainReleasesDir, path.resolve("/tmp", "levain"));

    envMap.TMP = "/custom/tmp";
    assertEquals(GeneralPaths.tempDir, "/custom/tmp");

    envMap.TMPDIR = "/custom/tmpdir";
    assertEquals(GeneralPaths.tempDir, "/custom/tmpdir");

    envMap.TEMP = "/custom/temp";
    assertEquals(GeneralPaths.tempDir, "/custom/temp");
    assertEquals(GeneralPaths.tempLevainReleasesDir, path.resolve("/custom/temp", "levain"));
  } finally {
    envStub.restore();
  }
});

Deno.test("ExtraBin should resolve platform-specific tool directories", () => {
  const expectedRoot = path.resolve(LevainPaths.levainSrcDir, "extra-bin", Deno.build.os);
  assertEquals(ExtraBin.extraBinDir, expectedRoot);
  assertEquals(ExtraBin.sevenZipDir, path.resolve(expectedRoot, "7-zip"));
  assertEquals(ExtraBin.gitDir, path.resolve(expectedRoot, "git"));
});
