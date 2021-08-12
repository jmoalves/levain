import TestHelper from "../../lib/test/test_helper.ts";
import GitCloneAction from "./clone.ts";
import {assert, assertEquals, assertThrowsAsync,} from "https://deno.land/std/testing/asserts.ts";
import {assertFolderIncludes} from "../../lib/test/more_asserts.ts";

Deno.test('GitCloneAction should be obtainable from the actionsCommand factory', () => {
    const action = TestHelper.getActionFromFactory("clone");

    assert(action instanceof GitCloneAction)
})

Deno.test('GitCloneAction should have a oneLineExample', () => {
    const action = new GitCloneAction()

    assertEquals(action.oneLineExample, 'clone <src-url> <dest-dir>')
})

Deno.test('GitCloneAction.execute should fail when called without params', async () => {
    const action = new GitCloneAction()

    await assertThrowsAsync(
        async () => {
            await action.execute(undefined, [])
        },
        Error,
        'Usage: clone <src-url> <dest-dir>',
    )
})

Deno.test('GitCloneAction.execute should clone a repo', async () => {
    const action = new GitCloneAction()
    const tempDir = TestHelper.getNewTempDir()
    const gitRepo = 'https://github.com/begin-examples/deno-hello-world.git'

    await action.execute(undefined, [
        gitRepo,
        tempDir,
    ])

    assertFolderIncludes(tempDir, ['package.json', 'readme.md', 'src'])

})
