import {assert, assertArrayIncludes,} from "https://deno.land/std/assert/mod.ts";
import OsUtils from "../../lib/os/os_utils.ts";

import TestHelper from '../../lib/test/test_helper.ts';
import AddPathAction from "./add_path.ts";

Deno.test('AddPathAction should be obtainable with action factory', () => {
    const action = TestHelper.getActionFromFactory("addPath")

    assert(action instanceof AddPathAction)
})
Deno.test('AddPathAction should add to path config', async () => {
    const config = TestHelper.getConfig()
    const action = new AddPathAction(config)

    await action.execute(TestHelper.mockPackage(), [TestHelper.folderThatAlwaysExists])

    assertArrayIncludes(config.context.action.addpath.path, [TestHelper.folderThatAlwaysExists])
})
if (OsUtils.isWindows()) {
    // TODO implement for Posix
    Deno.test('AddPathAction should add to path permanently', async () => {
        const config = TestHelper.getConfig()
        const action = new AddPathAction(config)

        const folder = TestHelper.folderThatAlwaysExists;
        //Given the folder is not in the user path
        await OsUtils.removePathPermanent(folder);
        let newPath = await OsUtils.getUserPath(); //wait for new Path to be written before asserting
        assert(!await OsUtils.isInUserPath(folder), `Shouldn't had the folder ${folder} in path - ${newPath}`);

        //When I execute the action
        await action.execute(TestHelper.mockPackage(), ['--permanent', folder]);

        //Then it should be on path
        newPath = await OsUtils.getUserPath(); //wait for new Path to be written before asserting
        assert(await OsUtils.isInUserPath(folder), `Should had the folder ${folder} in path - ${newPath}`);
    })
}
