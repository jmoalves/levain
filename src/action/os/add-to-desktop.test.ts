import { assert } from "@std/assert";
import * as path from "@std/path";
import { existsSync } from "@std/fs";
import TestHelper from "../../lib/test/test_helper.ts";
import OsUtils from "../../lib/os/os_utils.ts";
import ActionFactory from "../action_factory.ts";
import { assertPathExists } from "../../lib/test/more_asserts.ts";
import AddToDesktopAction from "./add-to-desktop.ts";

Deno.test("AddToDesktopAction should be obtainable with action factory", () => {
  const config = TestHelper.getConfig();
  const factory = new ActionFactory();

  const action = factory.get("addToDesktop", config);

  assert(action instanceof AddToDesktopAction);
});

if (OsUtils.isWindows()) {
  Deno.test("AddToDesktopAction should create shortcut in the desktop", async () => {
    const userProfile = Deno.env.get("USERPROFILE");
    const desktopPath = `${userProfile}/Desktop`;
    const filePath = TestHelper.getNewTempFile();
    const fileName = path.basename(filePath);
    const shortcutPath = path.resolve(desktopPath, `${fileName}.lnk`);
    if (existsSync(shortcutPath)) {
      Deno.removeSync(shortcutPath);
    }

    try {
      const action = getDesktopAction();
      await action.execute(TestHelper.mockPackage(), [filePath]);
      assertPathExists(shortcutPath);
    } finally {
      OsUtils.removeFile(shortcutPath);
    }
  });
}

function getDesktopAction() {
  const config = TestHelper.getConfig();
  const factory = new ActionFactory();
  const action = factory.get("addToDesktop", config);
  return action;
}
