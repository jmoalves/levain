import { existsSync } from "@std/fs";
import * as path from "@std/path";
import { assert, assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { stub } from "@std/testing/mock";

import LevainPaths from "../../lib/paths/levain_paths.ts";
import OsUtils from "../../lib/os/os_utils.ts";
import TestHelper from "../../lib/test/test_helper.ts";
import ActionFactory from "../action_factory.ts";
import ContextMenuRemoveAction from "./context_menu_remove.ts";

Deno.test("ContextMenuRemoveAction should be obtainable with action factory", () => {
  const config = TestHelper.getConfig();
  const factory = new ActionFactory();
  const action = factory.get("contextMenuRemove", config);

  assert(action instanceof ContextMenuRemoveAction);
});

Deno.test("ContextMenuRemoveAction should validate sub-action, id allowlist, and package", async () => {
  const action = new ContextMenuRemoveAction(TestHelper.getConfig());
  const pkg = TestHelper.mockPackage();

  await assertRejects(
    async () => await action.execute(pkg, ["--id=myId"]),
    "You must inform the 'folders' sub action",
  );
  await assertRejects(
    async () => await action.execute(pkg, ["folders"]),
    "You must inform the 'id' option",
  );
  await assertRejects(
    async () => await action.execute(pkg, ["folders", "--id=bad id"]),
    "The 'id' option must NOT contain spaces",
  );
  await assertRejects(
    async () => await action.execute(pkg, ["folders", "--id=bad\\evil"]),
    Error,
    "Invalid characters in 'id' option",
  );
  await assertRejects(
    async () => await action.execute(undefined, ["folders", "--id=myId"]),
    Error,
    "No package for action contextMenu",
  );
});

Deno.test("ContextMenuRemoveAction should render removal template, invoke reg import directly, and clean up temp file", async () => {
  const config = TestHelper.getConfig();
  const pkg = TestHelper.mockPackage();
  const regPath = path.join(LevainPaths.levainRecipesDir, "levain-shell-remove.reg");
  const replaceStub = stub(config, "replaceVars", () => Promise.resolve(regPath));

  let importedCmd: string[] | undefined;
  let renderedRegContent = "";
  const runStub = stub(OsUtils, "runAndLog", (cmd: string | string[]) => {
    if (Array.isArray(cmd) && cmd[0] === "reg" && cmd[1] === "import") {
      importedCmd = cmd;
      assert(existsSync(cmd[2]), "temp .reg file should exist during reg import");
      renderedRegContent = Deno.readTextFileSync(cmd[2]);
    }
    return Promise.resolve("");
  });

  try {
    const action = new ContextMenuRemoveAction(config);
    await action.execute(pkg, ["folders", "--id=demoShell", "--name=Open Demo", "--cmd=demo.exe"]);

    assert(importedCmd, "should have invoked reg import directly");
    assertEquals(importedCmd[0], "reg");
    assertEquals(importedCmd[1], "import");
    assertStringIncludes(renderedRegContent, "[-HKEY_CURRENT_USER\\Software\\Classes\\Directory\\shell\\demoShell]");
    assertEquals(existsSync(importedCmd[2]), false, "temp .reg file should be cleaned up after execute");
  } finally {
    runStub.restore();
    replaceStub.restore();
  }
});
