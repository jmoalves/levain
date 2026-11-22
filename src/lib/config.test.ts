import { assert, assertEquals, assertMatch, assertNotEquals } from "@std/assert";
import * as path from "@std/path";

import Config from "./config.ts";
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
  const config = new Config({ levainCache: "cache/" });

  assertEquals(config.configPaths.levainCacheDir, "cache/");
});
Deno.test("Config should replaceVars", async () => {
  const config = new Config({ myVar: "myValue" });

  const replacedVars = await config.replaceVars("home: ${myVar}");

  assertMatch(replacedVars, /home: myValue/);
});
