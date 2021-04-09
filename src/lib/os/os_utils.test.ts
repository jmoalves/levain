import {assert, assertEquals, assertNotEquals} from "https://deno.land/std/testing/asserts.ts";
import {existsSync} from "https://deno.land/std/fs/exists.ts";


import OsUtils from "./os_utils.ts";
import {assertGreaterThan} from "../test/more_asserts.ts";
import TestHelper from "../test/test_helper.ts";

Deno.test('should know where is the temp folder', () => {
    assertNotEquals(OsUtils.tempDir, undefined);
    assert(existsSync(OsUtils.tempDir));
})

Deno.test('should know where is the home folder', () => {
    assertNotEquals(OsUtils.homeDir, undefined)
    assert(existsSync(OsUtils.homeDir));
})

Deno.test('should know the users login', () => {
    assertNotEquals(OsUtils.login, undefined)
})

Deno.test('should know if we are running in Windows', () => {
    const os = Deno.build.os
    const shouldBeWindows = (os === 'windows')
    assertEquals(OsUtils.isWindows(), shouldBeWindows)
})

if (OsUtils.isWindows()) {
    Deno.test({
        name: 'should get path',
        async fn() {
            const path = await OsUtils.getUserPath()
            assertGreaterThan(path?.length, 5)
        }
    })
}

if (OsUtils.isWindows()) { 
    Deno.test('Should set path permanently', async () => { 
        const config = TestHelper.getConfig();
        
        await OsUtils.addPathPermanent(TestHelper.folderThatAlwaysExists, config);
    })
}