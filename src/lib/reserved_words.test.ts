import * as path from "@std/path";
import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { stub } from "@std/testing/mock";

import ActionFactory from "../action/action_factory.ts";
import OsUtils from "./os/os_utils.ts";
import {
  assertAllowedPackageName,
  assertNotReservedEnvVarName,
  assertNotReservedVarName,
  canonicalizeVarName,
  isAllowedLevainYamlKey,
  isReservedEnvPrefix,
  isReservedEnvVarName,
  isReservedPackageName,
  isReservedVarName,
  isUnknownReservedYamlKey,
} from "./reserved_words.ts";
import TestHelper from "./test/test_helper.ts";
import VarResolver from "./var_resolver.ts";

Deno.test("reserved_words - package name checks are strictly case-insensitive", () => {
  for (const name of ["levain", "LEVAIN", "LeVaIN", "  Levain  "]) {
    assertEquals(isReservedPackageName(name), true, `expected reserved: ${name}`);
  }
  for (const name of ["", "levain-context-menu", "my-levain", "maven", "jdk"]) {
    assertEquals(isReservedPackageName(name), false, `expected allowed: ${name}`);
  }
});

Deno.test("reserved_words - variable and env var checks are strictly case-insensitive", () => {
  const alwaysReserved = [
    "levain",
    "LEVAIN",
    "LeVaIN",
    "levain.login",
    "LEVAIN.PASSWORD",
    "LeVaIn.Custom",
    "levainHome",
    "LEVAINHOME",
    "LeVaInHoMe",
    "levainCache",
    "LEVAINCACHE",
    "LeVaInCaChE",
    "LEVAIN_CURRENT",
    "levain_custom",
    "LeVaIn_Custom",
    "_LEVAIN_OLD_PROMPT",
    "_levain_base_ps1",
    "__LEVAIN_SECRET_0",
    "__LeVaIn_Internal",
  ];

  for (const name of alwaysReserved) {
    assertEquals(isReservedVarName(name), true, `expected reserved var: ${name}`);
    assertEquals(isReservedEnvVarName(name), true, `expected reserved env: ${name}`);
  }

  for (const envPrefixed of ["LEVAIN_CURRENT", "levain_foo", "_LEVAIN_OLD_PROMPT", "__LeVaIn_Secret"]) {
    assertEquals(isReservedEnvPrefix(envPrefixed), true);
  }
  assertEquals(isReservedEnvPrefix("JAVA_HOME"), false);

  // Explicit levain.var.default.<non-reserved> is allowed for recipe vars, but forbidden for OS env vars
  assertEquals(isReservedVarName("levain.var.default.myKey"), false);
  assertEquals(isReservedVarName("LeVaIn.Var.Default.myKey"), false);
  assertEquals(isReservedVarName("levain.var.default."), true);
  assertEquals(isReservedVarName("levain.var.default.LEVAIN_CURRENT"), true);
  assertEquals(isReservedVarName("levain.var.default._LEVAIN_OLD_PROMPT"), true);
  assertEquals(isReservedVarName("levain.var.default.levain.password"), true);
  assertEquals(isReservedVarName("levain.var.default.levainHome"), true);
  assertEquals(isReservedVarName("levain.var.default.levain.var.default.x"), true);
  assertEquals(isReservedEnvVarName("levain.var.default.myKey"), true);

  for (const allowed of ["", "JAVA_HOME", "M2_HOME", "myVar", "my_levain_tool"]) {
    assertEquals(isReservedVarName(allowed), false, `expected allowed var: ${allowed}`);
    assertEquals(isReservedEnvVarName(allowed), false, `expected allowed env: ${allowed}`);
  }
});

Deno.test("reserved_words - YAML key allowlist enforces exact directives while warning on any unknown or mis-cased reserved key", () => {
  for (
    const allowed of [
      "levain",
      "levain.minVersion",
      "levain.pkg.skipInstallDir",
      "levain.pkg.skipRegistry",
      "levain.preserveBaseDirOnUpdate",
      "levain.config.noBaseDir",
      "levain.var.default.sampleKey",
    ]
  ) {
    assertEquals(isAllowedLevainYamlKey(allowed), true, `expected allowed YAML key: ${allowed}`);
    assertEquals(isUnknownReservedYamlKey(allowed), false, `should not warn for allowed key: ${allowed}`);
  }

  for (
    const unknown of [
      "LEVAIN",
      "LeVaIn.MinVersion",
      "LEVAIN.PKG.SKIPREGISTRY",
      "levain.unknown",
      "LEVAIN.TYPO",
      "LeVaIn.Pkg.SkipInstalDir",
      "levain.var.default.",
      "levain.var.default.LEVAIN_CURRENT",
      "levain.var.default.levain.password",
      "LEVAIN.VAR.DEFAULT.other",
      "levainHome",
      "LeVaInCache",
      "levain_extra",
      "LeVaIn_Extra",
      "_LEVAIN_OLD_PROMPT",
      "__LEVAIN_INTERNAL",
    ]
  ) {
    assertEquals(isUnknownReservedYamlKey(unknown), true, `expected warning for unknown reserved key: ${unknown}`);
  }

  for (const normal of ["version", "dependencies", "cmd.install", "customAttr"]) {
    assertEquals(isUnknownReservedYamlKey(normal), false);
  }

  // canonicalizeVarName trims and normalizes mixed-case levain.var.default. prefix only
  assertEquals(canonicalizeVarName("LeVaIn.Var.Default.myKey"), "levain.var.default.myKey");
  assertEquals(canonicalizeVarName("  LeVaIn.Var.Default.myKey  "), "levain.var.default.myKey");
  assertEquals(canonicalizeVarName("levain.var.default."), "levain.var.default.");
  assertEquals(canonicalizeVarName("myNormalVar"), "myNormalVar");
});

Deno.test("reserved_words - assertAllowedPackageName enforces allowed directories on POSIX and Windows", () => {
  const allowedDir = TestHelper.getNewTempDir();
  const externalDir = TestHelper.getNewTempDir();

  for (const isWin of [false, true]) {
    const winStub = stub(OsUtils, "isWindows", () => isWin);
    try {
      // Allowed inside built-in or registry dir
      assertAllowedPackageName("levain", path.join(allowedDir, "recipes", "levain.levain.yaml"), [allowedDir]);
      assertAllowedPackageName("LeVaIn", path.join(allowedDir, "levain.levain.yaml"), [allowedDir]);
      // Non-reserved packages allowed anywhere
      assertAllowedPackageName("levain-context-menu", path.join(externalDir, "levain-context-menu.levain.yaml"), [
        allowedDir,
      ]);
      // Reserved package outside allowed dirs throws
      assertThrows(
        () => assertAllowedPackageName("LEVAIN", path.join(externalDir, "LEVAIN.levain.yaml"), [allowedDir]),
        Error,
      );
      assertThrows(
        () => assertAllowedPackageName("levain", path.join(externalDir, "levain.levain.yaml"), [allowedDir]),
        Error,
      );
    } finally {
      winStub.restore();
    }
  }

  // Direct assertion helpers
  assertNotReservedVarName("SAFE_VAR", "setVar");
  assertNotReservedEnvVarName("SAFE_ENV", "setEnv");
  assertThrows(() => assertNotReservedVarName("LeVaIn.login", "setVar"), Error);
  assertThrows(() => assertNotReservedEnvVarName("LeVaIn_CURRENT", "setEnv"), Error);
});

Deno.test("reserved_words - all variable/env writing actions reject reserved names case-insensitively", async () => {
  const config = TestHelper.getConfig();
  const factory = new ActionFactory();
  const pkg = TestHelper.mockPackage();
  const dir = TestHelper.getNewTempDir();
  const jsonFile = path.join(dir, "data.json");
  const propFile = path.join(dir, "app.properties");
  await Deno.writeTextFile(jsonFile, '{"k":"v"}');
  await Deno.writeTextFile(propFile, "k=v\n");

  // setVar
  await assertRejects(() => factory.get("setVar", config).execute(pkg, ["LEVAIN", "bad"]), Error);
  await assertRejects(() => factory.get("setVar", config).execute(pkg, ["LeVaIn.login", "bad"]), Error);
  await assertRejects(() => factory.get("setVar", config).execute(pkg, ["LeVaIn_Foo", "bad"]), Error);
  await assertRejects(() => factory.get("setVar", config).execute(pkg, ["_LEVAIN_OLD_PROMPT", "bad"]), Error);
  await assertRejects(() => factory.get("setVar", config).execute(pkg, ["levain.var.default.LEVAIN_CURRENT", "bad"]), Error);

  // setEnv
  await assertRejects(() => factory.get("setEnv", config).execute(pkg, ["LEVAIN_CURRENT", "hack"]), Error);
  await assertRejects(() => factory.get("setEnv", config).execute(pkg, ["_LEVAIN_OLD_PROMPT", "hack"]), Error);
  await assertRejects(() => factory.get("setEnv", config).execute(pkg, ["LeVaIn", "hack"]), Error);
  await assertRejects(() => factory.get("setEnv", config).execute(pkg, ["__LeVaIn_SECRET_0", "hack"]), Error);
  await assertRejects(() => factory.get("setEnv", config).execute(pkg, ["levain.var.default.x", "hack"]), Error);

  // jsonGet --setVar
  await assertRejects(
    () => factory.get("jsonGet", config).execute(pkg, ["--setVar=LeVaIn.homeDir", jsonFile, "k"]),
    Error,
  );

  // propertyGet --setVar
  await assertRejects(
    () => factory.get("propertyGet", config).execute(pkg, ["--setVar=LEVAINHOME", propFile, "k"]),
    Error,
  );

  // inspect --saveVar
  await assertRejects(
    () => factory.get("inspect", config).execute(pkg, ["--regExp=/k=(.*)/", "--saveVar=LeVaIN", propFile]),
    Error,
  );

  // checkChainDirExists --saveVar
  await assertRejects(
    () => factory.get("checkChainDirExists", config).execute(pkg, ["--saveVar=LEVAIN_DIR", dir]),
    Error,
  );

  // levainShell --saveVar (rejects BEFORE spawning shell, so works cross-platform)
  await assertRejects(
    () => factory.get("levainShell", config).execute(pkg, ["--saveVar=LeVaIn.password", "echo", "hi"]),
    Error,
  );

  // Explicit levain.var.default.<name> remains allowed via setVar (even with mixed-case prefix) and resolves cleanly
  await factory.get("setVar", config).execute(pkg, ["LeVaIn.Var.Default.myFallback", "default-ok"]);
  assertEquals(await VarResolver.getVarValue("myFallback", undefined, config), "default-ok");
});
