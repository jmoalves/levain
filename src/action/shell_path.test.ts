import { assert, assertEquals, assertRejects } from "@std/assert";

import TestHelper from "../lib/test/test_helper.ts";
import ActionFactory from "./action_factory.ts";
import ShellPath from "./shell_path.ts";

Deno.test("ShellPath should be registered in ActionFactory", () => {
  const action = new ActionFactory().get("shellPath", TestHelper.getConfig());
  assert(action instanceof ShellPath);
});

Deno.test("ShellPath should require exactly one path argument", async () => {
  const action = new ShellPath(TestHelper.getConfig());

  await assertRejects(
    async () => await action.execute(undefined, []),
    "You must inform the shell path",
  );
  await assertRejects(
    async () => await action.execute(undefined, ["a", "b"]),
    "You must inform the shell path",
  );
});

Deno.test("ShellPath should update config.shellPath", async () => {
  const config = TestHelper.getConfig();
  const fakeShell = TestHelper.getNewTempFile();
  const action = new ShellPath(config);

  await action.execute(undefined, [fakeShell]);
  assertEquals(config.shellPath, fakeShell);
});
