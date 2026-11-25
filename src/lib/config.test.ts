import { assert, assertEquals, assertMatch, assertNotEquals, assertThrows } from "@std/assert";
import * as path from "@std/path";
import { stub } from "@std/testing/mock";

import Config from "./config.ts";
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
