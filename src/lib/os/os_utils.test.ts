import {assert, assertEquals, assertNotEquals} from "https://deno.land/std/testing/asserts.ts";
import {existsSync} from "https://deno.land/std/fs/exists.ts";


import OsUtils from "./os_utils.ts";
import {assertGreaterThan} from "../test/more_asserts.ts";
import TestHelper from "../test/test_helper.ts";

Deno.test('OsUtils should know where is the temp folder', () => {
    assertNotEquals(OsUtils.tempDir, undefined);
    assert(existsSync(OsUtils.tempDir));
})

Deno.test('OsUtils should know where is the home folder', () => {
    assertNotEquals(OsUtils.homeDir, undefined)
    assert(existsSync(OsUtils.homeDir));
})

Deno.test('OsUtils should know the users login', () => {
    assertNotEquals(OsUtils.login, undefined)
})

Deno.test('OsUtils should know if we are running in Windows', () => {
    const os = Deno.build.os
    const shouldBeWindows = (os === 'windows')
    assertEquals(OsUtils.isWindows(), shouldBeWindows)
})

if (OsUtils.isWindows()) {
    Deno.test({
        name: 'OsUtils.getUserPath should get path',
        async fn() {
            const path = await OsUtils.getUserPath()
            assertGreaterThan(path?.length, 5)
        }
    })

    Deno.test('OsUtils.addPathPermanent should set path permanently', async () => {

        //Given the users folder is not in the path
        const folder = TestHelper.folderThatAlwaysExists;
        await OsUtils.removePathPermanent(folder);
        assert(!await OsUtils.isInUserPath(folder), `Shouldn't have the folder ${folder} in path - ${await OsUtils.getUserPath()}`);

        //When I add to the path
        await OsUtils.addPathPermanent(folder);

        //Then it should be there
        assert(await OsUtils.isInUserPath(folder), `Should have the folder ${folder} in path - ${await OsUtils.getUserPath()}`);
    })
}
