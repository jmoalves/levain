import { assert } from "@std/assert";
import * as path from "@std/path";
import TestHelper from "../../lib/test/test_helper.ts";
import ActionFactory from "../action_factory.ts";
import AddToStartMenuAction from "./add-to-start-menu.ts";
import OsUtils from "../../lib/os/os_utils.ts";
import { assertPathDoesNotExist, assertPathExists } from "../../lib/test/more_asserts.ts";

Deno.test("AddToStartMenuAction should be obtainable with action factory", () => {
  const config = TestHelper.getConfig();
  const factory = new ActionFactory();
  const action = factory.get("addToStartMenu", config);

  assert(action instanceof AddToStartMenuAction);
});

if (OsUtils.isWindows()) {
  Deno.test("AddToStartMenuAction should create shortcut in the start menu folder", async () => {
    const userProfile = Deno.env.get("USERPROFILE");
    const startMenuPath = `${userProfile}/AppData/Roaming/Microsoft/Windows/Start Menu/Programs`;
    const filePath = TestHelper.getNewTempFile();
    const fileName = path.basename(filePath);
    const shortcutPath = path.resolve(startMenuPath, `${fileName}.lnk`);
    OsUtils.removeFile(shortcutPath);

    try {
      const action = getStartMenuAction();
      await action.execute(TestHelper.mockPackage(), [filePath]);
      assertPathExists(shortcutPath);
    } finally {
      OsUtils.removeFile(shortcutPath);
    }
  });

  Deno.test("AddToStartMenuAction should be able to create folder in the start menu with a file inside", async () => {
    const userProfile = Deno.env.get("USERPROFILE");
    const startMenuPath = `${userProfile}/AppData/Roaming/Microsoft/Windows/Start Menu/Programs`;
    const folderName = `levain-test-${crypto.randomUUID().slice(0, 8)}`;
    const filePath = TestHelper.getNewTempFile();
    const fileName = path.basename(filePath);
    const folderPath = path.resolve(startMenuPath, folderName);
    OsUtils.removeDir(folderPath);
    assertPathDoesNotExist(folderPath);

    try {
      const action = getStartMenuAction();
      await action.execute(TestHelper.mockPackage(), [filePath, folderName]);

      const shortcutPath = path.resolve(startMenuPath, folderName, `${fileName}.lnk`);
      assertPathExists(shortcutPath);
    } finally {
      OsUtils.removeDir(folderPath);
    }
  });
}

function getStartMenuAction() {
  const config = TestHelper.getConfig();
  return new AddToStartMenuAction(config);
}
