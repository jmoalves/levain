import {assert} from "jsr:@std/assert";
import * as path from "jsr:@std/path";
import {existsSync} from "jsr:@std/fs";
import TestHelper from '../../lib/test/test_helper.ts';
import OsUtils from '../../lib/os/os_utils.ts';
import ActionFactory from '../action_factory.ts';
import AddToStartupAction from './add_to_startup.ts';
import {assertPathExists} from "../../lib/test/more_asserts.ts";


Deno.test('AddToStartupAction should be obtainable with action factory', () => {
    const config = TestHelper.getConfig()
    const factory = new ActionFactory()
    const action = factory.get("addToStartup", config)

    assert(action instanceof AddToStartupAction)
})


if (OsUtils.isWindows()) {
    Deno.test("AddToStartupAction should create shortcut in the correct folder", async () => {

        //Given that shortcut is not in the startup folder
        const userProfile = Deno.env.get("USERPROFILE");
        const startupPath = `${userProfile}/AppData/Roaming/Microsoft/Windows/Start Menu/Programs/Startup`;
        const fileName = "document.txt";
        const currentFileDir = path.dirname(import.meta.url);
        const filePath = `${currentFileDir}/../../testdata/add_to_startup/${fileName}`;
        const shortcutPath = path.resolve(startupPath, `${fileName}.lnk`);
        if (existsSync(shortcutPath)) {
            Deno.removeSync(shortcutPath);
        }

        //when I execute the action
        const action = getStartupAction();
        await action.execute(TestHelper.mockPackage(), [filePath]);

        //Then the shortcut should exist in the startup folder
        assertPathExists(shortcutPath);
    })
}


function getStartupAction() {
    const config = TestHelper.getConfig()
    const factory = new ActionFactory()
    const action = factory.get("addToStartup", config)
    return action;
}
