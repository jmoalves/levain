import { assert, assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";

import OsUtils from "../../lib/os/os_utils.ts";
import TestHelper from "../../lib/test/test_helper.ts";
import ActionFactory from "../action_factory.ts";
import KillProcessAction from "./killProcess.ts";

Deno.test("KillProcessAction should be obtainable from ActionFactory", () => {
  const config = TestHelper.getConfig();
  const factory = new ActionFactory();
  const action = factory.get("killProcess", config);

  assert(action instanceof KillProcessAction);
});

Deno.test("KillProcessAction should require process name", async () => {
  const action = new KillProcessAction();

  await assertRejects(
    async () => {
      await action.execute(undefined, []);
    },
    Error,
    "You must inform the process name",
  );
});

Deno.test("KillProcessAction should invoke taskkill via OsUtils.runAndLog on Windows", async () => {
  const commands: string[][] = [];
  const winStub = stub(OsUtils, "onlyInWindows", () => {});
  const runStub = stub(OsUtils, "runAndLog", (cmd: string | string[]) => {
    commands.push(Array.isArray(cmd) ? cmd : [cmd]);
    return Promise.resolve("");
  });

  try {
    const action = new KillProcessAction();
    await action.execute(undefined, ["demo-app.exe"]);

    assertEquals(winStub.calls.length, 1);
    assertEquals(commands, [
      ["start", "/wait", "taskkill", "/f", "/im", "demo-app.exe"],
    ]);
  } finally {
    runStub.restore();
    winStub.restore();
  }
});
