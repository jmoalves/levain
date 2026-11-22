import { assert } from "@std/assert";
import * as path from "@std/path";
import { existsSync } from "@std/fs";
import TestHelper from "../../lib/test/test_helper.ts";
import OsUtils from "../../lib/os/os_utils.ts";
import ActionFactory from "../action_factory.ts";
import AddToStartupAction from "./add_to_startup.ts";
import { assertPathExists } from "../../lib/test/more_asserts.ts";

Deno.test("AddToStartupAction should be obtainable with action factory", () => {
  const config = TestHelper.getConfig();
  const factory = new ActionFactory();
  const action = factory.get("addToStartup", config);

  assert(action instanceof AddToStartupAction);
});

if (OsUtils.isWindows()) {
  Deno.test("AddToStartupAction should create shortcut in the correct folder", async () => {
    const userProfile = Deno.env.get("USERPROFILE");
    const startupPath = `${userProfile}/AppData/Roaming/Microsoft/Windows/Start Menu/Programs/Startup`;
    const filePath = TestHelper.getNewTempFile();
    const fileName = path.basename(filePath);
    const shortcutPath = path.resolve(startupPath, `${fileName}.lnk`);
    if (existsSync(shortcutPath)) {
      Deno.removeSync(shortcutPath);
    }

    try {
      const action = getStartupAction();
      await action.execute(TestHelper.mockPackage(), [filePath]);
      assertPathExists(shortcutPath);
    } finally {
      OsUtils.removeFile(shortcutPath);
    }
  });
}

function getStartupAction() {
  const config = TestHelper.getConfig();
  const factory = new ActionFactory();
  const action = factory.get("addToStartup", config);
  return action;
}
