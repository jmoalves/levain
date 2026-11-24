import { assert, assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";

import BashInitializer from "../../lib/activate/bash_initializer.ts";
import CmdInitializer from "../../lib/activate/cmd_initializer.ts";
import CmderInitializer from "../../lib/activate/cmder_initializer.ts";
import PowershellInitializer from "../../lib/activate/powershell_initializer.ts";
import OsUtils from "../../lib/os/os_utils.ts";
import TestHelper from "../../lib/test/test_helper.ts";
import ActionFactory from "../action_factory.ts";
import ActivateInit from "./activate_init.ts";

Deno.test("ActivateInit should be registered in ActionFactory", () => {
  const action = new ActionFactory().get("activateInit", TestHelper.getConfig());
  assert(action instanceof ActivateInit);
});

Deno.test("ActivateInit with no flags should install platform default shell initializers", async () => {
  const cmdStub = stub(CmdInitializer.prototype, "install", () => Promise.resolve());
  const bashStub = stub(BashInitializer.prototype, "install", () => Promise.resolve());
  const psStub = stub(PowershellInitializer.prototype, "install", () => Promise.resolve());
  const cmderStub = stub(CmderInitializer.prototype, "install", () => Promise.resolve());

  try {
    const action = new ActivateInit(TestHelper.getConfig());
    await action.execute(undefined, []);

    const expectedWin = OsUtils.isWindows() ? 1 : 0;
    assertEquals(cmdStub.calls.length, expectedWin);
    assertEquals(bashStub.calls.length, 1);
    assertEquals(psStub.calls.length, expectedWin);
    assertEquals(cmderStub.calls.length, 0);
  } finally {
    cmderStub.restore();
    psStub.restore();
    bashStub.restore();
    cmdStub.restore();
  }
});

Deno.test("ActivateInit should invoke selected initializers with profile/config paths and respect --dev", async () => {
  const capturedCmd: unknown[] = [];
  const capturedPs: unknown[] = [];
  const capturedCmder: unknown[] = [];

  const cmdStub = stub(CmdInitializer.prototype, "install", function (this: CmdInitializer) {
    capturedCmd.push(...Object.values(this as unknown as Record<string, unknown>));
    return Promise.resolve();
  });
  const bashStub = stub(BashInitializer.prototype, "install", () => Promise.resolve());
  const psStub = stub(PowershellInitializer.prototype, "install", function (this: PowershellInitializer) {
    capturedPs.push(...Object.values(this as unknown as Record<string, unknown>));
    return Promise.resolve();
  });
  const cmderStub = stub(CmderInitializer.prototype, "install", function (this: CmderInitializer) {
    capturedCmder.push(...Object.values(this as unknown as Record<string, unknown>));
    return Promise.resolve();
  });

  try {
    const config = TestHelper.getConfig();
    const action = new ActivateInit(config);

    await action.execute(undefined, [
      "--cmd",
      "--bash",
      "--powershell",
      "--powershell-profile=/mock/profile.ps1",
      "--cmder",
      "--cmder-config=/mock/cmder.ps1",
    ]);

    assertEquals(cmdStub.calls.length, 1);
    assertEquals(bashStub.calls.length, 1);
    assertEquals(psStub.calls.length, 1);
    assertEquals(cmderStub.calls.length, 1);
    assert(capturedCmd.includes(config.configPaths.levainBaseDir));
    assert(capturedPs.includes("/mock/profile.ps1"));
    assert(capturedCmder.includes("/mock/cmder.ps1"));

    // With --dev, levainCmdPath switches to Deno.cwd()
    capturedCmd.length = 0;
    await action.execute(undefined, ["--dev", "--cmd"]);
    assert(capturedCmd.includes(Deno.cwd()));

    // Passing --powershell-profile or --cmder-config alone implies their shell initializer only
    cmdStub.calls.length = 0;
    bashStub.calls.length = 0;
    psStub.calls.length = 0;
    cmderStub.calls.length = 0;
    await action.execute(undefined, ["--powershell-profile=/only/ps.ps1"]);
    assertEquals(psStub.calls.length, 1);
    assertEquals(cmdStub.calls.length, 0);
    assertEquals(bashStub.calls.length, 0);
    assertEquals(cmderStub.calls.length, 0);

    psStub.calls.length = 0;
    await action.execute(undefined, ["--cmder-config=/only/cmder"]);
    assertEquals(cmderStub.calls.length, 1);
    assertEquals(cmdStub.calls.length, 0);
    assertEquals(bashStub.calls.length, 0);
    assertEquals(psStub.calls.length, 0);
  } finally {
    cmderStub.restore();
    psStub.restore();
    bashStub.restore();
    cmdStub.restore();
  }
});
