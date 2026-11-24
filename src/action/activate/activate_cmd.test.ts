import * as path from "@std/path";
import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { stub } from "@std/testing/mock";

import Shell from "../../cmd/shell.ts";
import { OsShell } from "../../lib/os/os_shell.ts";
import OsUtils from "../../lib/os/os_utils.ts";
import PackageManager from "../../lib/package/package_manager.ts";
import TestHelper from "../../lib/test/test_helper.ts";
import ActionFactory from "../action_factory.ts";
import ActivateCmd from "./activate_cmd.ts";

Deno.test("ActivateCmd should be registered in ActionFactory", () => {
  const action = new ActionFactory().get("activateCmd", TestHelper.getConfig());
  assert(action instanceof ActivateCmd);
});

Deno.test("ActivateCmd.emitEnv should safely quote environment variables for cmd, powershell, and bash", () => {
  const action = new ActivateCmd(TestHelper.getConfig());
  const lines: string[] = [];
  const origLog = console.log;

  try {
    console.log = (...args: unknown[]) => lines.push(args.join(" "));

    action.emitEnv({ APP_HOME: "C:\\tools\\app", AMP_VAL: "a & b %PATH%" }, "cmd");
    action.emitEnv({ QUOTE_CMD: 'say "hi" & echo pwn' }, "cmd");
    action.emitEnv({ QUOTED_VAL: `say "hello" $(calc) 'world' \u2019smart\u2018` }, "powershell");
    action.emitEnv({ BASH_VAL: `a "b" $(calc) 'c'` }, "bash");

    assertEquals(lines, [
      'set "APP_HOME=C:\\tools\\app"',
      'set "AMP_VAL=a & b %%PATH%%"',
      'set QUOTE_CMD=say ^"hi^" ^& echo pwn',
      `$env:QUOTED_VAL = 'say "hello" $(calc) ''world'' \u2019\u2019smart\u2018\u2018'`,
      `export BASH_VAL='a "b" $(calc) '\\''c'\\'''`,
    ]);
  } finally {
    console.log = origLog;
  }
});

Deno.test("ActivateCmd.emitEnv should reject newlines, NULs, invalid variable names, and unsupported shells", () => {
  const action = new ActivateCmd(TestHelper.getConfig());

  assertThrows(() => action.emitEnv({ GOOD: "line1\ncalc" }, "cmd"), Error, "CR, LF, or NUL");
  assertThrows(() => action.emitEnv({ GOOD: "line1\rcalc" }, "powershell"), Error, "CR, LF, or NUL");
  assertThrows(() => action.emitEnv({ GOOD: "bad\0val" }, "bash"), Error, "CR, LF, or NUL");
  assertThrows(() => action.emitEnv({ "BAD=1&calc": "x" }, "cmd"), Error, "Invalid environment variable name");
  assertThrows(() => action.emitEnv({ "BAD;calc": "x" }, "powershell"), Error, "Invalid environment variable name");
  assertThrows(() => action.emitEnv({ "BAD-NAME": "x" }, "bash"), Error, "Invalid environment variable name");
  assertThrows(() => action.emitEnv({ GOOD: "x" }, "fish"), Error, "Unsupported shell: fish");
});

if (OsUtils.isWindows()) {
  Deno.test("ActivateCmd.emitEnv cmd output should preserve metacharacters and quotes when executed by cmd.exe", async () => {
    const action = new ActivateCmd(TestHelper.getConfig());
    const lines: string[] = [];
    const origLog = console.log;
    const expectedValues: Record<string, string> = {
      LEV_TEST_AMP: "a & b | c < d > e (f) %TEMP%",
      LEV_TEST_QUOTES: 'say "hello" & echo not_executed',
    };

    try {
      console.log = (...args: unknown[]) => lines.push(args.join(" "));
      action.emitEnv(expectedValues, "cmd");
    } finally {
      console.log = origLog;
    }

    const tempDir = TestHelper.getNewTempDir();
    const scriptPath = path.join(tempDir, "activate_test.cmd");
    const outPath = path.join(tempDir, "out.json");
    const checkCmd = [
      "@echo off",
      ...lines,
      `setlocal enabledelayedexpansion`,
      `"${Deno.execPath()}" eval "Deno.writeTextFileSync(Deno.args[0], JSON.stringify({ amp: Deno.env.get('LEV_TEST_AMP'), quotes: Deno.env.get('LEV_TEST_QUOTES') }))" "${outPath}"`,
    ].join("\r\n");
    await Deno.writeTextFile(scriptPath, checkCmd);

    const result = await new Deno.Command("cmd", { args: ["/d", "/c", scriptPath] }).output();
    assertEquals(result.success, true, new TextDecoder().decode(result.stderr));

    const actual = JSON.parse(await Deno.readTextFile(outPath));
    assertEquals(actual.amp, expectedValues.LEV_TEST_AMP);
    assertEquals(actual.quotes, expectedValues.LEV_TEST_QUOTES);
  });
}

Deno.test("ActivateCmd.execute should suppress runShell output, emit shell env, and toggle cmd PROMPT", async () => {
  const config = TestHelper.getConfig();
  const mockPkg = TestHelper.mockPackage();
  const lines: string[] = [];
  const origLog = console.log;
  let luaLoaded: string | undefined = undefined;

  const envStub = stub(Deno.env, "get", (key: string) => (key === "LEVAIN_LUA_LOADED" ? luaLoaded : undefined));
  const readStub = stub(Shell.prototype, "readPackages", () =>
    Promise.resolve({ pkgNames: ["pkgA"], pkgActions: undefined, curDirPkg: undefined })
  );
  const resolveStub = stub(PackageManager.prototype, "resolvePackages", () => [mockPkg]);
  const runShellStub = stub(Shell.prototype, "runShell", () => {
    console.log("should-be-suppressed");
    console.error("should-also-be-suppressed");
    return Promise.resolve();
  });
  const prepareEnvStub = stub(OsShell.prototype, "prepareEnv", (env: Record<string, string>) => {
    env.LEVAIN_CURRENT = "pkgA";
    return Promise.resolve();
  });

  try {
    console.log = (...args: unknown[]) => lines.push(args.join(" "));
    const action = new ActivateCmd(config);

    // Default shell = cmd without LEVAIN_LUA_LOADED -> includes safely escaped PROMPT
    await action.execute(undefined, ["pkgA"]);
    assertEquals(lines, [
      'set "LEVAIN_CURRENT=pkgA"',
      'set "PROMPT=[pkgA] $P$G"',
    ]);

    // cmd with LEVAIN_LUA_LOADED set -> omits PROMPT
    lines.length = 0;
    luaLoaded = "1";
    await action.execute(undefined, ["--shell=cmd", "pkgA"]);
    assertEquals(lines, ['set "LEVAIN_CURRENT=pkgA"']);

    // powershell
    lines.length = 0;
    luaLoaded = undefined;
    await action.execute(undefined, ["--shell=powershell", "pkgA"]);
    assertEquals(lines, ["$env:LEVAIN_CURRENT = 'pkgA'"]);

    // bash
    lines.length = 0;
    await action.execute(undefined, ["--shell=bash", "pkgA"]);
    assertEquals(lines, ["export LEVAIN_CURRENT='pkgA'"]);
  } finally {
    console.log = origLog;
    prepareEnvStub.restore();
    runShellStub.restore();
    resolveStub.restore();
    readStub.restore();
    envStub.restore();
  }
});

Deno.test("ActivateCmd.execute should restore console.log and console.error if runShell throws", async () => {
  const config = TestHelper.getConfig();
  const mockPkg = TestHelper.mockPackage();
  const origLog = console.log;
  const origError = console.error;

  const readStub = stub(Shell.prototype, "readPackages", () =>
    Promise.resolve({ pkgNames: ["pkgA"], pkgActions: undefined, curDirPkg: undefined })
  );
  const resolveStub = stub(PackageManager.prototype, "resolvePackages", () => [mockPkg]);
  const runShellStub = stub(Shell.prototype, "runShell", () => Promise.reject(new Error("boom")));

  try {
    const action = new ActivateCmd(config);
    await assertRejects(async () => await action.execute(undefined, ["pkgA"]), Error, "boom");
    assert(console.log === origLog, "console.log should be restored");
    assert(console.error === origError, "console.error should be restored");
  } finally {
    console.log = origLog;
    console.error = origError;
    runShellStub.restore();
    resolveStub.restore();
    readStub.restore();
  }
});
