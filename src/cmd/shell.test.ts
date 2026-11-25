import { assert, assertEquals, assertFalse, assertRejects } from "@std/assert";
import { existsSync } from "@std/fs";
import { stub } from "@std/testing/mock";

import t from "../lib/i18n.ts";
import Loader from "../lib/loader.ts";
import { OsShell } from "../lib/os/os_shell.ts";
import OsUtils from "../lib/os/os_utils.ts";
import FileSystemPackage from "../lib/package/file_system_package.ts";
import { PackageManagerMock } from "../lib/package/package_manager_mock.ts";
import TestHelper from "../lib/test/test_helper.ts";

import CommandFactory from "./command_factory.ts";
import Shell from "./shell.ts";

Deno.test("Shell should be registered in CommandFactory", () => {
  const factory = new CommandFactory();
  const cmd = factory.get("shell", TestHelper.getConfig());
  assert(cmd instanceof Shell);
});

Deno.test("Shell.readPackages should use explicit arguments when provided", async () => {
  const config = TestHelper.getConfig();
  const cmd = new Shell(config);

  const result = await cmd.readPackages(["pkgA", "pkgB"]);
  assertEquals(result.pkgNames, ["pkgA", "pkgB"]);
  assertEquals(result.pkgActions, undefined);
  assertEquals(result.curDirPkg, undefined);
});

Deno.test("Shell.readPackages should use currentDirPackage dependencies and combine cmd.shell + cmd.env", async () => {
  const config = TestHelper.getConfig();
  const curPkg = new FileSystemPackage(
    config,
    "project-pkg",
    TestHelper.getNewTempDir(),
    "project-pkg.levain.yaml",
    [
      "version: 1.0.0",
      "dependencies:",
      "  - jdk",
      "  - maven",
      "cmd.shell:",
      "  - echo entering shell",
      "cmd.env:",
      "  - setEnv PROJECT_MODE dev",
    ].join("\n"),
  );

  const curDirStub = stub(config.repositoryManager, "currentDirPackage", () => Promise.resolve(curPkg));
  try {
    const cmd = new Shell(config);
    const result = await cmd.readPackages([]);

    assertEquals(result.pkgNames, ["levain", "jdk", "maven"]);
    assertEquals(result.pkgActions, ["echo entering shell", "setEnv PROJECT_MODE dev"]);
    assertEquals(result.curDirPkg, curPkg);
    // Ensure original cmd.shell array on package is not mutated in place
    assertEquals(curPkg.yamlItem("cmd.shell"), ["echo entering shell"]);
  } finally {
    curDirStub.restore();
  }
});

Deno.test("Shell.readPackages should use cmd.env alone when cmd.shell is absent", async () => {
  const config = TestHelper.getConfig();
  const curPkg = new FileSystemPackage(
    config,
    "project-env-only",
    TestHelper.getNewTempDir(),
    "project-env-only.levain.yaml",
    [
      "version: 1.0.0",
      "dependencies:",
      "  - git",
      "cmd.env:",
      "  - setEnv ENV_ONLY true",
    ].join("\n"),
  );

  const curDirStub = stub(config.repositoryManager, "currentDirPackage", () => Promise.resolve(curPkg));
  try {
    const cmd = new Shell(config);
    const result = await cmd.readPackages([]);

    assertEquals(result.pkgNames, ["levain", "git"]);
    assertEquals(result.pkgActions, ["setEnv ENV_ONLY true"]);
  } finally {
    curDirStub.restore();
  }
});

Deno.test("Shell.readPackages should fall back to config.defaultPackage when no currentDirPackage", async () => {
  const config = TestHelper.getConfig();
  config.defaultPackage = "my-default-pkg";

  const curDirStub = stub(config.repositoryManager, "currentDirPackage", () => Promise.resolve(undefined));
  try {
    const cmd = new Shell(config);
    const result = await cmd.readPackages([]);

    assertEquals(result.pkgNames, ["my-default-pkg"]);
    assertEquals(result.pkgActions, undefined);
  } finally {
    curDirStub.restore();
  }
});

Deno.test("Shell.installPackages should acquire and release InstanceLock around install and reload", async () => {
  const config = TestHelper.getConfig();
  const commandCalls: Array<{ cmd: string; args: string[] }> = [];
  let lockExistedDuringInstall = false;
  const sanitizeStub = stub(OsUtils, "sanitizeUserPath", () => Promise.resolve());
  const loaderCmdStub = stub(Loader.prototype, "command", (cmd: string, args: string[]) => {
    lockExistedDuringInstall = existsSync(config.configPaths.levainLockPath);
    commandCalls.push({ cmd, args });
    return Promise.resolve();
  });
  const reloadStub = stub(config.repositoryManager, "reload", () => Promise.resolve());

  try {
    const cmd = new Shell(config);

    config.shellCheckForUpdate = true;
    await cmd.installPackages(["pkgA"]);
    assert(lockExistedDuringInstall, "lock should be held while install runs");
    assertFalse(existsSync(config.configPaths.levainLockPath), "lock must be released before interactive shell opens");

    config.shellCheckForUpdate = false;
    await cmd.installPackages(["pkgA", "pkgB"]);

    assertEquals(commandCalls, [
      { cmd: "install", args: ["pkgA"] },
      { cmd: "install", args: ["--noUpdate", "pkgA", "pkgB"] },
    ]);
    assertEquals(reloadStub.calls.length, 2);
  } finally {
    reloadStub.restore();
    loaderCmdStub.restore();
    sanitizeStub.restore();
  }
});

Deno.test("Shell.runShell should execute pkgActions and invoke osShell.execute", async () => {
  const config = TestHelper.getConfig();
  const curPkg = TestHelper.mockPackage();
  const executedActions: string[] = [];
  const shellCalls: Array<{ args: string[]; openShell: boolean }> = [];

  const actionStub = stub(Loader.prototype, "action", (_pkg, action: string) => {
    executedActions.push(action);
    return Promise.resolve();
  });

  const fakeOsShell = {
    execute(args: string[], openShell: boolean) {
      shellCalls.push({ args, openShell });
      return Promise.resolve();
    },
  } as unknown as OsShell;

  try {
    const cmd = new Shell(config);
    await cmd.runShell(fakeOsShell, curPkg, ["setEnv FOO bar", "echo hi"], false);

    assertEquals(executedActions, ["setEnv FOO bar", "echo hi"]);
    assertEquals(shellCalls, [{ args: [], openShell: false }]);
  } finally {
    actionStub.restore();
  }
});

Deno.test("Shell.runShell should forbid levainShell actions to prevent infinite recursion", async () => {
  const config = TestHelper.getConfig();
  const curPkg = TestHelper.mockPackage();
  const fakeOsShell = {
    execute() {
      return Promise.resolve();
    },
  } as unknown as OsShell;

  const cmd = new Shell(config);
  await assertRejects(
    async () => await cmd.runShell(fakeOsShell, curPkg, ["levainShell echo boom"], false),
    Error,
    t("cmd.shell.notAllowed", { pkg: curPkg.name, action: "levainShell echo boom" }),
  );
});

Deno.test("Shell.execute orchestrates readPackages, installPackages, and interactive OsShell", async () => {
  const config = TestHelper.getConfig();
  config.packageManager = new PackageManagerMock(config);
  const cmd = new Shell(config);

  const installCalls: string[][] = [];
  let interactiveFlag = false;
  const installStub = stub(cmd, "installPackages", (pkgs: string[]) => {
    installCalls.push(pkgs);
    return Promise.resolve();
  });
  const runStub = stub(cmd, "runShell", (osShell: OsShell) => {
    interactiveFlag = osShell.interactive;
    return Promise.resolve();
  });

  try {
    await cmd.execute(["pkgA"]);
    assertEquals(installCalls, [["pkgA"]]);
    assertEquals(interactiveFlag, true);
  } finally {
    runStub.restore();
    installStub.restore();
  }
});
