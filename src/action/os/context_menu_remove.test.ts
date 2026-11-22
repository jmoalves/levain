import { assert, assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";

import Loader from "../../lib/loader.ts";
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

Deno.test("ContextMenuRemoveAction should validate sub-action, id, and package", async () => {
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
    async () => await action.execute(undefined, ["folders", "--id=myId"]),
    Error,
    "No package for action contextMenu",
  );
});

Deno.test("ContextMenuRemoveAction should render removal template and invoke levainShell reg import", async () => {
  const config = TestHelper.getConfig();
  const pkg = TestHelper.mockPackage();
  const actionsRun: string[] = [];
  let createdTempFile: string | undefined;

  const loaderStub = stub(Loader.prototype, "action", (_pkg, cmdline: string) => {
    actionsRun.push(cmdline);
    if (cmdline.startsWith("levainShell reg import ")) {
      createdTempFile = cmdline.slice("levainShell reg import ".length);
    }
    return Promise.resolve();
  });

  try {
    const action = new ContextMenuRemoveAction(config);
    await action.execute(pkg, ["folders", "--id=demoShell", "--name=Open Demo", "--cmd=demo.exe"]);

    assertEquals(actionsRun.length, 2);
    assert(actionsRun[0].startsWith("template "));
    assert(actionsRun[0].includes('--with="demoShell"'));
    assert(actionsRun[0].includes("--doubleBackslash"));
    assert(actionsRun[0].includes("${pkg.levain.recipesDir}/levain-shell-remove.reg"));
    assert(actionsRun[1].startsWith("levainShell reg import "));
  } finally {
    loaderStub.restore();
    if (createdTempFile) {
      OsUtils.removeFile(createdTempFile);
    }
  }
});
