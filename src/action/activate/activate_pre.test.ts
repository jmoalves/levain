import { assert, assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";

import Shell from "../../cmd/shell.ts";
import type { OsShell } from "../../lib/os/os_shell.ts";
import PackageManager from "../../lib/package/package_manager.ts";
import TestHelper from "../../lib/test/test_helper.ts";
import ActionFactory from "../action_factory.ts";
import ActivatePre from "./activate_pre.ts";

Deno.test("ActivatePre should be registered in ActionFactory", () => {
  const action = new ActionFactory().get("activatePre", TestHelper.getConfig());
  assert(action instanceof ActivatePre);
});

Deno.test("ActivatePre should read packages, install them, and run shell actions without opening shell", async () => {
  const config = TestHelper.getConfig();
  const mockPkg = TestHelper.mockPackage();
  const readArgs: string[][] = [];
  const installedPkgLists: string[][] = [];
  const runShellCalls: Array<{ interactive: boolean; openShell: boolean; actions: string[] | undefined }> = [];

  const readStub = stub(Shell.prototype, "readPackages", (args: string[]) => {
    readArgs.push(args);
    return Promise.resolve({
      pkgNames: ["pkgA"],
      pkgActions: ["setEnv PRE_TEST 1"],
      curDirPkg: mockPkg,
    });
  });
  const installStub = stub(Shell.prototype, "installPackages", (pkgNames: string[]) => {
    installedPkgLists.push(pkgNames);
    return Promise.resolve();
  });
  const resolveStub = stub(PackageManager.prototype, "resolvePackages", () => [mockPkg]);
  const runShellStub = stub(
    Shell.prototype,
    "runShell",
    (osShell: OsShell, _curDirPkg, pkgActions: string[] | undefined, openShell: boolean) => {
      runShellCalls.push({ interactive: osShell.interactive, openShell, actions: pkgActions });
      return Promise.resolve();
    },
  );

  try {
    const action = new ActivatePre(config);
    await action.execute(undefined, ["pkgA"]);

    assertEquals(readArgs, [["pkgA"]]);
    assertEquals(installedPkgLists, [["pkgA"]]);
    assertEquals(runShellCalls, [{ interactive: true, openShell: false, actions: ["setEnv PRE_TEST 1"] }]);
  } finally {
    runShellStub.restore();
    resolveStub.restore();
    installStub.restore();
    readStub.restore();
  }
});
