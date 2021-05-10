import TestHelper from "../../lib/test/test_helper.ts";
import ActionFactory from "../action_factory.ts";
import AddToStartMenuAction from "./add-to-start-menu.ts";
import {assert} from "https://deno.land/std/testing/asserts.ts";
import OsUtils from "../../lib/os/os_utils.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {assertPathDoesNotExist, assertPathExists} from "../../lib/test/more_asserts.ts";


Deno.test('AddToStartMenuAction should be obtainable with action factory', () => {
    const config = TestHelper.getConfig()
    const factory = new ActionFactory()
    const action = factory.get("addToStartMenu", config)

    assert(action instanceof AddToStartMenuAction)
})

if (OsUtils.isWindows()) {
    Deno.test("AddToStartMenuAction should create shortcut in the start menu folder", async () => {
        //Given the shortcut doesn't exist in the start menu already
        const userProfile = Deno.env.get("USERPROFILE");
        const startMenuPath = `${userProfile}/AppData/Roaming/Microsoft/Windows/Start Menu/Programs`;
        const fileName = "document.txt";
        const shortcutPath = path.resolve(startMenuPath, `${fileName}.lnk`);
        OsUtils.removeFile(shortcutPath)

        const currentFileDir = path.dirname(import.meta.url);
        const filePath = `${currentFileDir}/../../testdata/add_to_startup/${fileName}`;

        //when I execute the action
        const action = getStartMenuAction();
        await action.execute(TestHelper.mockPackage(), [filePath]);

        //Then the shortcut should exist in the start menu folder
        assertPathExists(shortcutPath);
    })

    Deno.test("AddToStartMenuAction should be able to create folder in the start menu with a file inside", async () => {
        //Given the folder doesn't exist in the start menu already
        const userProfile = Deno.env.get("USERPROFILE");
        const startMenuPath = `${userProfile}/AppData/Roaming/Microsoft/Windows/Start Menu/Programs`;
        const folderName = "dev-env-test";
        const fileName = "document.txt";
        const folderPath = path.resolve(startMenuPath, folderName)
        OsUtils.removeDir(folderPath)
        assertPathDoesNotExist(folderPath);

        //And it should get the file
        const currentFileDir = path.dirname(import.meta.url);
        const filePath = path.resolve(currentFileDir, '../../testdata/add_to_startup', fileName);

        //when I execute the action
        const action = getStartMenuAction();
        await action.execute(TestHelper.mockPackage(), [filePath, folderName]);

        //Then the shortcut should exist in the new created folder
        const shortcutPath = path.resolve(startMenuPath, folderName, `${fileName}.lnk`);
        assertPathExists(shortcutPath);
    })
}

function getStartMenuAction() {
    const config = TestHelper.getConfig()
    return new AddToStartMenuAction(config)
}
