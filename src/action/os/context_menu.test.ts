import { existsSync } from "@std/fs";
import * as path from "@std/path";
import { assert, assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { stub } from "@std/testing/mock";

import LevainPaths from "../../lib/paths/levain_paths.ts";
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

Deno.test("ContextMenuAction should validate sub-action, required options, id allowlist, control chars, and package", async () => {
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
    async () => await action.execute(pkg, ["folders", "--id=bad]section", "--name=Open", "--cmd=cmd.exe"]),
    Error,
    "Invalid characters in 'id' option",
  );
  await assertRejects(
    async () => await action.execute(pkg, ["folders", "--id=myId", "--name=Open\n[Evil]", "--cmd=cmd.exe"]),
    Error,
    "must not contain CR, LF, or NUL",
  );
  await assertRejects(
    async () => await action.execute(undefined, ["folders", "--id=myId", "--name=Open", "--cmd=cmd.exe"]),
    Error,
    "No package for action contextMenu",
  );
});

Deno.test("ContextMenuAction should render escaped .reg file, run reg import directly, and clean up temp file", async () => {
  const config = TestHelper.getConfig();
  const pkg = TestHelper.mockPackage();
  const regPath = path.join(LevainPaths.levainRecipesDir, "levain-shell.reg");
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
    const action = new ContextMenuAction(config);
    await action.execute(pkg, [
      "folders",
      "--id=demo-shell",
      "--name=Open \"Demo\"",
      '--cmd=C:\\tools\\demo.exe /k "%V"',
    ]);

    assert(importedCmd, "should have invoked reg import directly");
    assertEquals(importedCmd[0], "reg");
    assertEquals(importedCmd[1], "import");
    assertStringIncludes(renderedRegContent, "\\shell\\demo-shell]");
    assertStringIncludes(renderedRegContent, '@="Open \\"Demo\\""');
    assertStringIncludes(renderedRegContent, '"Icon"=""');
    assertStringIncludes(renderedRegContent, '@="cmd /u /c C:\\\\tools\\\\demo.exe /k \\"%V\\""');
    assertEquals(existsSync(importedCmd[2]), false, "temp .reg file should be cleaned up after execute");
  } finally {
    runStub.restore();
    replaceStub.restore();
  }
});

Deno.test("ContextMenuAction should clean up temp .reg file even if reg import fails", async () => {
  const config = TestHelper.getConfig();
  const pkg = TestHelper.mockPackage();
  const regPath = path.join(LevainPaths.levainRecipesDir, "levain-shell.reg");
  const replaceStub = stub(config, "replaceVars", () => Promise.resolve(regPath));
  let createdTempFile: string | undefined;

  const runStub = stub(OsUtils, "runAndLog", (cmd: string | string[]) => {
    if (Array.isArray(cmd) && cmd[0] === "reg" && cmd[1] === "import") {
      createdTempFile = cmd[2];
    }
    return Promise.reject(new Error("reg import failed"));
  });

  try {
    const action = new ContextMenuAction(config);
    await assertRejects(
      async () =>
        await action.execute(pkg, [
          "folders",
          "--id=demoShell",
          "--name=Open Demo",
          "--cmd=demo.exe %V",
        ]),
      Error,
      "reg import failed",
    );
    assert(createdTempFile);
    assertEquals(existsSync(createdTempFile), false, "temp .reg file should be cleaned up on error");
  } finally {
    runStub.restore();
    replaceStub.restore();
  }
});
