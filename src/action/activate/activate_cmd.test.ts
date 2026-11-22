import { assert, assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";

import Shell from "../../cmd/shell.ts";
import { OsShell } from "../../lib/os/os_shell.ts";
import PackageManager from "../../lib/package/package_manager.ts";
import TestHelper from "../../lib/test/test_helper.ts";
import ActionFactory from "../action_factory.ts";
import ActivateCmd from "./activate_cmd.ts";

Deno.test("ActivateCmd should be registered in ActionFactory", () => {
  const action = new ActionFactory().get("activateCmd", TestHelper.getConfig());
  assert(action instanceof ActivateCmd);
});

Deno.test("ActivateCmd.emitEnv should format environment variables for cmd, powershell, and bash", () => {
  const action = new ActivateCmd(TestHelper.getConfig());
  const lines: string[] = [];
  const origLog = console.log;

  try {
    console.log = (...args: unknown[]) => lines.push(args.join(" "));

    action.emitEnv({ APP_HOME: "C:\\tools\\app" }, "cmd");
    action.emitEnv({ QUOTED_VAL: 'say "hello"' }, "powershell");
    action.emitEnv({ BASH_VAL: 'a "b" c' }, "bash");

    assertEquals(lines, [
      "set APP_HOME=C:\\tools\\app",
      '$env:QUOTED_VAL = "say `"hello`""',
      'export BASH_VAL="a \\"b\\" c"',
    ]);
  } finally {
    console.log = origLog;
  }
});

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

    // Default shell = cmd without LEVAIN_LUA_LOADED -> includes PROMPT
    await action.execute(undefined, ["pkgA"]);
    assertEquals(lines, [
      "set LEVAIN_CURRENT=pkgA",
      'set "PROMPT=[%LEVAIN_CURRENT%] %_LEVAIN_OLD_PROMPT%"',
    ]);

    // cmd with LEVAIN_LUA_LOADED set -> omits PROMPT
    lines.length = 0;
    luaLoaded = "1";
    await action.execute(undefined, ["--shell=cmd", "pkgA"]);
    assertEquals(lines, ["set LEVAIN_CURRENT=pkgA"]);

    // powershell
    lines.length = 0;
    luaLoaded = undefined;
    await action.execute(undefined, ["--shell=powershell", "pkgA"]);
    assertEquals(lines, ['$env:LEVAIN_CURRENT = "pkgA"']);

    // bash
    lines.length = 0;
    await action.execute(undefined, ["--shell=bash", "pkgA"]);
    assertEquals(lines, ['export LEVAIN_CURRENT="pkgA"']);
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
