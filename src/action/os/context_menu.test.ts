import { assert, assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";

import Loader from "../../lib/loader.ts";
import OsUtils from "../../lib/os/os_utils.ts";
import TestHelper from "../../lib/test/test_helper.ts";
import ActionFactory from "../action_factory.ts";
import ContextMenuAction from "./context_menu.ts";

Deno.test("ContextMenuAction should be obtainable with action factory", () => {
  const config = TestHelper.getConfig();
  const factory = new ActionFactory();
  const action = factory.get("contextMenu", config);

  assert(action instanceof ContextMenuAction);
});

Deno.test("ContextMenuAction should validate sub-action, required options, and package", async () => {
  const action = new ContextMenuAction(TestHelper.getConfig());
  const pkg = TestHelper.mockPackage();

  await assertRejects(
    async () => await action.execute(pkg, ["--id=myId", "--name=Open", "--cmd=cmd.exe"]),
    "You must inform the 'folders' sub action",
  );
  await assertRejects(
    async () => await action.execute(pkg, ["folders", "--name=Open", "--cmd=cmd.exe"]),
    "You must inform the 'id' option",
  );
  await assertRejects(
    async () => await action.execute(pkg, ["folders", "--id=myId", "--cmd=cmd.exe"]),
    "You must inform the 'name' option",
  );
  await assertRejects(
    async () => await action.execute(pkg, ["folders", "--id=myId", "--name=Open"]),
    "You must inform the 'cmd' option",
  );
  await assertRejects(
    async () => await action.execute(pkg, ["folders", "--id=bad id", "--name=Open", "--cmd=cmd.exe"]),
    "The 'id' option must NOT contain spaces",
  );
  await assertRejects(
    async () => await action.execute(undefined, ["folders", "--id=myId", "--name=Open", "--cmd=cmd.exe"]),
    Error,
    "No package for action contextMenu",
  );
});

Deno.test("ContextMenuAction should render template registry file and invoke levainShell reg import", async () => {
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
    const action = new ContextMenuAction(config);
    await action.execute(pkg, [
      "folders",
      "--id=demoShell",
      "--name=Open Demo",
      "--cmd=demo.exe %V",
      "--icon=demo.ico",
    ]);

    assertEquals(actionsRun.length, 2);
    assert(actionsRun[0].startsWith("template "));
    assert(actionsRun[0].includes('--with="demoShell"'));
    assert(actionsRun[0].includes('--with="Open Demo"'));
    assert(actionsRun[0].includes('--with="demo.exe %V"'));
    assert(actionsRun[0].includes('--with="demo.ico"'));
    assert(actionsRun[0].includes("--doubleBackslash"));
    assert(actionsRun[0].includes("${pkg.levain.recipesDir}/levain-shell.reg"));
    assert(actionsRun[1].startsWith("levainShell reg import "));
  } finally {
    loaderStub.restore();
    if (createdTempFile) {
      OsUtils.removeFile(createdTempFile);
    }
  }
});
