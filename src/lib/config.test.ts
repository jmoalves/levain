import { assert, assertEquals, assertMatch, assertNotEquals, assertThrows } from "@std/assert";
import * as path from "@std/path";
import { stub } from "@std/testing/mock";

import Config from "./config.ts";
import { FileUtils } from "./fs/file_utils.ts";
import HomePaths from "./paths/home_paths.ts";
import { assertStringEndsWith } from "./test/more_asserts.ts";
import TestHelper from "./test/test_helper.ts";

//
// dirs
//
Deno.test("Config should have levainHome", () => {
  const config = new Config([]);

  const dir = config.configPaths.levainHome;

  assert(dir);
});
Deno.test("Config should have levainConfigDir", () => {
  const config = new Config([]);

  const dir = config.configPaths.levainConfigDir;

  assertStringEndsWith(dir, ".levain");
});
Deno.test("Config should have levainSafeTempDir", () => {
  const config = new Config([]);

  const dir = config.configPaths.levainSafeTempDir;

  assertStringEndsWith(dir, path.join(".levain", "temp"));
});

Deno.test("Config should have levainBackupDir", () => {
  const config = new Config([]);

  const dir = config.configPaths.levainBackupDir;

  assertStringEndsWith(dir, path.join(".levain", "backup"));
});
Deno.test("Config should set levainBackupDir", () => {
  const config = new Config([]);

  const newDir = TestHelper.getNewTempDir();
  config.configPaths.levainBackupDir = newDir;

  assertEquals(config.configPaths.levainBackupDir, newDir);
});

Deno.test("Config should have levainRegistryDir", () => {
  const config = new Config([]);

  const dir = config.configPaths.levainRegistryDir;

  assertStringEndsWith(dir, path.join(".levain", "registry"));
});
Deno.test("Config should have a registry", () => {
  const config = new Config([]);

  const registry = config.levainRegistry;

  assertNotEquals(registry, undefined);
});

Deno.test("Config should have assertNotEquals default levainCache", () => {
  const config = new Config([]);

  const dir = config.configPaths.levainCacheDir;
  
  assertEquals(dir, path.join(config.configPaths.levainHome, ".levainCache"));
});
Deno.test("Config should set levainCache", () => {
  const config = new Config([]);

  const newDir = TestHelper.getNewTempDir();
  config.configPaths.levainCacheDir = newDir;

  assertEquals(config.configPaths.levainCacheDir, newDir);
});
Deno.test("Config should config levainCache with cli args", () => {
  const cacheDir = path.join(TestHelper.getNewTempDir(), "cache");
  const config = new Config({ levainCache: cacheDir });

  assertEquals(config.configPaths.levainCacheDir, cacheDir);
});
Deno.test("Config should replaceVars", async () => {
  const config = new Config({ myVar: "myValue" });

  const replacedVars = await config.replaceVars("home: ${myVar}");

  assertMatch(replacedVars, /home: myValue/);
});

Deno.test("Config should persist lastAutoClean and let CLI --levainHome pick first valid dir over saved config", () => {
  const tempDir = TestHelper.getNewTempDir();
  const savedHome = path.join(tempDir, "saved-home");
  const cliHome = path.join(tempDir, "cli-home");
  const blockingFile = path.join(tempDir, "blocking-file");
  Deno.writeTextFileSync(blockingFile, "not a dir");
  const invalidCandidate = path.join(blockingFile, "nested");

  const homeStub = stub(HomePaths, "homedir", () => tempDir);
  try {
    const config1 = new Config({ levainHome: [savedHome] });
    config1.lastAutoClean = "20261124";
    config1.lastUpdateCheck = "20261124";
    config1.autoUpdate = false;
    config1.save();

    // Reload without CLI override -> restores saved levainHome, lastAutoClean, lastUpdateCheck, and autoUpdate=false
    const config2 = new Config({});
    assertEquals(config2.configPaths.levainHome, path.resolve(savedHome));
    assertEquals(config2.lastAutoClean, "20261124");
    assertEquals(config2.lastUpdateCheck, "20261124");
    assertEquals(config2.autoUpdate, false);

    // saveIfChanged skips saving when unchanged and saves when mutated
    const saveStub = stub(config2, "save", () => {});
    try {
      config2.saveIfChanged();
      assertEquals(saveStub.calls.length, 0);
      config2.lastUpdateCheck = "20261125";
      config2.saveIfChanged();
      assertEquals(saveStub.calls.length, 1);
    } finally {
      saveStub.restore();
    }

    // CLI --levainHome list skips invalid candidate, overrides saved levainHome, and updates default cacheDir
    const config3 = new Config({ levainHome: [invalidCandidate, cliHome] });
    assertEquals(config3.configPaths.levainHome, path.resolve(cliHome));
    assertEquals(config3.getVar("levainHome"), path.resolve(cliHome));
    assertEquals(config3.configPaths.levainCacheDir, path.join(path.resolve(cliHome), ".levainCache"));

    // Legacy oldLevainConfigFile must not overwrite explicit CLI --levainHome
    Deno.removeSync(HomePaths.levainConfigFile);
    const legacyDir = path.join(cliHome, ".levain");
    Deno.mkdirSync(legacyDir, { recursive: true });
    Deno.writeTextFileSync(
      path.join(legacyDir, "config.json"),
      JSON.stringify({ levainHome: savedHome }),
    );
    const config4 = new Config({ levainHome: [cliHome] });
    assertEquals(config4.configPaths.levainHome, path.resolve(cliHome));

    // When no candidate in --levainHome is valid, throw clearly
    assertThrows(() => new Config({ levainHome: [invalidCandidate] }));
  } finally {
    homeStub.restore();
  }
});

Deno.test("Config validates shellPath, persists optional fields, resolves levainHome fallbacks, and surfaces IO errors", () => {
  const tempDir = TestHelper.getNewTempDir();
  const exePath = path.join(tempDir, "my-shell.exe");
  Deno.writeTextFileSync(exePath, "");
  const homeStub = stub(HomePaths, "homedir", () => tempDir);
  try {
    // 1. Fallback to ENV levainHome when no saved config exists
    const envHome = path.join(tempDir, "env-home");
    const envStub = stub(Deno.env, "get", (key: string) => (key === "levainHome" ? envHome : undefined));
    try {
      const cfgEnv = new Config({});
      assertEquals(cfgEnv.configPaths.levainHome, path.resolve(envHome));
    } finally {
      envStub.restore();
    }

    // 2. Fallback to HomePaths.levainFallbackHome when env is absent
    const envEmptyStub = stub(Deno.env, "get", () => undefined);
    try {
      const cfgDefault = new Config({});
      assertEquals(cfgDefault.configPaths.levainHome, HomePaths.levainFallbackHome);
    } finally {
      envEmptyStub.restore();
    }

    // 3. Fallback to sibling ../.levain/config.json relative to levainSrcDir
    const infoStub = stub(FileUtils, "getFileInfoSync", () => ({ isFile: true }) as Deno.FileInfo);
    try {
      const cfgSibling = new Config({});
      assert(cfgSibling.configPaths.levainHome.length > 0);
    } finally {
      infoStub.restore();
    }

    // 4. Persist and reload all optional fields + validate shellPath getter + setVar("levainHome")
    const cfg = new Config({ levainHome: path.join(tempDir, "h1") });
    cfg.defaultPackage = "my-pkg";
    cfg.lastKnownVersion = "1.2.3";
    cfg.lastUpdateQuestion = "20261125";
    cfg.shellCheckForUpdate = false;
    cfg.shellPath = exePath;
    assertEquals(cfg.shellPath, exePath);
    assertEquals(cfg.lastKnownVersion, "1.2.3");
    assertEquals(cfg.lastUpdateQuestion, "20261125");
    assertEquals(cfg.shellCheckForUpdate, false);

    // Non-existent shellPath and directory shellPath return undefined
    cfg.shellPath = path.join(tempDir, "does-not-exist.exe");
    assertEquals(cfg.shellPath, undefined);
    cfg.shellPath = tempDir;
    assertEquals(cfg.shellPath, undefined);

    cfg.shellPath = exePath;
    cfg.setVar("levainHome", path.join(tempDir, "h2"));
    assertEquals(cfg.configPaths.levainHome, path.join(tempDir, "h2"));
    cfg.save();

    const reloaded = new Config({});
    assertEquals(reloaded.defaultPackage, "my-pkg");
    assertEquals(reloaded.shellPath, exePath);
    assertEquals(reloaded.lastKnownVersion, "1.2.3");
    assertEquals(reloaded.lastUpdateQuestion, "20261125");
    assertEquals(reloaded.shellCheckForUpdate, false);

    // 5. Non-NotFound read error in loadText rethrows
    const readErrStub = stub(FileUtils, "readTextFileSync", () => {
      throw new Deno.errors.PermissionDenied("denied");
    });
    try {
      assertThrows(() => new Config({}), Deno.errors.PermissionDenied);
    } finally {
      readErrStub.restore();
    }

    // 6. Non-NotFound removeSync error in save() rethrows
    const removeErrStub = stub(FileUtils, "removeSync", () => {
      throw new Deno.errors.PermissionDenied("cannot delete old config");
    });
    try {
      assertThrows(() => reloaded.save(), Deno.errors.PermissionDenied);
    } finally {
      removeErrStub.restore();
    }
  } finally {
    homeStub.restore();
  }
});
