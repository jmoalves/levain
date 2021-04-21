import {assert, assertEquals, assertMatch, assertNotEquals} from "https://deno.land/std/testing/asserts.ts";
import {existsSync} from "https://deno.land/std/fs/exists.ts";
import * as path from "https://deno.land/std/path/mod.ts";


import OsUtils from "./os_utils.ts";
import {assertFileExists, assertGreaterThan} from "../test/more_asserts.ts";
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

Deno.test('OsUtils should create a shortcut/symlink to a file', () => {
    // Given that I have an empty dir
    const tempDir = TestHelper.getNewTempDir()
    // And a file
    const anyFile = TestHelper.getNewTempFile()

    // When I create a symlink to the file in the empty dir
    OsUtils.createShortcut(anyFile, [tempDir, 'new-link'])

    // Then the new symlink should exist
    assertFileExists(path.join(tempDir, 'new-link'))
})

Deno.test('OsUtils.resolvePath should resolve a string', () => {
    // Given an unresolved string path
    const unresolvedPath = 'abc/123'
    // When I resolve the path
    const resolvedPath = OsUtils.resolvePath(unresolvedPath)
    // It should end with my path
    assertMatch(resolvedPath, /abc[\/\\]+123/)
})

Deno.test('OsUtils.resolvePath should resolve a string array', () => {
    // Given an unresolved string array path
    const unresolvedPath = ['abc', '123']
    // When I resolve the path
    const resolvedPath = OsUtils.resolvePath(unresolvedPath)
    // It should end with my path
    assertMatch(resolvedPath, /abc[\/\\]+123/)
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
