import {assert} from "https://deno.land/std/testing/asserts.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {existsSync} from "https://deno.land/std/fs/mod.ts";
import TestHelper from '../../lib/test/test_helper.ts';
import OsUtils from '../../lib/os/os_utils.ts';
import ActionFactory from '../action_factory.ts';
import {assertFileExists} from "../../lib/test/more_asserts.ts";
import AddToDesktopAction from "./add-to-desktop.ts";


Deno.test('AddToDesktopAction should be obtainable with action factory', () => {
    const config = TestHelper.getConfig()
    const factory = new ActionFactory()

    const action = factory.get("addToDesktop", config)

    assert(action instanceof AddToDesktopAction)
})


if (OsUtils.isWindows()) {
    Deno.test("AddToDesktopAction should create shortcut in the desktop", async () => {

        //Given that shortcut is not in the desktop already
        const userProfile = Deno.env.get("USERPROFILE");
        const desktopPath = `${userProfile}/Desktop`;
        const fileName = "document.txt";
        const currentFileDir = path.dirname(import.meta.url);
        const filePath = `${currentFileDir}/../../testdata/add_to_startup/${fileName}`;
        const shortcutPath = path.resolve(desktopPath, `${fileName}.lnk`);
        if (existsSync(shortcutPath)) {
            Deno.removeSync(shortcutPath);
        }

        //when I execute the action
        const action = getDesktopAction();
        await action.execute(TestHelper.mockPackage(), [filePath]);

        //Then the shortcut should exist in the desktop
        assertFileExists(shortcutPath);
    })
}


function getDesktopAction() {
    const config = TestHelper.getConfig()
    const factory = new ActionFactory()
    const action = factory.get("addToDesktop", config)
    return action;
}
