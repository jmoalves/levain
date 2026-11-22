import { assert, assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";

import ActivateCmd from "../action/activate/activate_cmd.ts";
import ActivateInit from "../action/activate/activate_init.ts";
import ActivatePre from "../action/activate/activate_pre.ts";
import t from "../lib/i18n.ts";
import TestHelper from "../lib/test/test_helper.ts";

import ActivateMachine from "./activate_machine.ts";
import CommandFactory from "./command_factory.ts";

Deno.test("ActivateMachine should be registered in CommandFactory", () => {
  const factory = new CommandFactory();
  const cmd = factory.get("_activate-machine", TestHelper.getConfig());
  assert(cmd instanceof ActivateMachine);
  // TODO(phase-4.5): ActivateMachine currently reuses cmd.shell.example instead of its own example string.
  assertEquals(cmd.oneLineExample, t("cmd.shell.example"));
});

Deno.test("ActivateMachine should dispatch init, pre, and cmd subcommands with remaining args", async () => {
  const calls: Array<{ action: string; args: string[] }> = [];
  const initStub = stub(ActivateInit.prototype, "execute", (_pkg, args) => {
    calls.push({ action: "init", args });
    return Promise.resolve();
  });
  const preStub = stub(ActivatePre.prototype, "execute", (_pkg, args) => {
    calls.push({ action: "pre", args });
    return Promise.resolve();
  });
  const cmdStub = stub(ActivateCmd.prototype, "execute", (_pkg, args) => {
    calls.push({ action: "cmd", args });
    return Promise.resolve();
  });

  try {
    const cmd = new ActivateMachine(TestHelper.getConfig());
    await cmd.execute(["init", "--dev"]);
    await cmd.execute(["pre", "pkgA"]);
    await cmd.execute(["cmd", "pkgA", "pkgB"]);

    assertEquals(calls, [
      { action: "init", args: ["--dev"] },
      { action: "pre", args: ["pkgA"] },
      { action: "cmd", args: ["pkgA", "pkgB"] },
    ]);
  } finally {
    initStub.restore();
    preStub.restore();
    cmdStub.restore();
  }
});

Deno.test("ActivateMachine should reject invalid or missing subcommand", async () => {
  const cmd = new ActivateMachine(TestHelper.getConfig());

  await assertRejects(
    async () => await cmd.execute(["unknown"]),
    Error,
    "Action must be init|pre|cmd",
  );
  await assertRejects(
    async () => await cmd.execute([]),
    Error,
    "Action must be init|pre|cmd",
  );
});
