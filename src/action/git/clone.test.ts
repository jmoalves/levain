import TestHelper from "../../lib/test/test_helper.ts";
import GitCloneAction from "./clone.ts";
import {assert, assertEquals, assertRejects,} from "https://deno.land/std/testing/asserts.ts";
import {assertDirCount, assertFolderDoesNotInclude, assertFolderIncludes,} from "../../lib/test/more_asserts.ts";
import {ensureFileSync,} from "https://deno.land/std/fs/mod.ts"
import * as path from "https://deno.land/std/path/mod.ts"

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

    await assertRejects(
        async () => {
            await action.execute(undefined, [])
        },
        Error,
        'Usage: clone <src-url> <dest-dir>',
    )
})

Deno.test('GitCloneAction.execute should clone a repo', async () => {
    const action = new GitCloneAction()
    const gitRepo = 'https://github.com/begin-examples/deno-hello-world.git'
    const cloneDir = TestHelper.getNewTempDir()

    await action.execute(undefined, [
        gitRepo,
        cloneDir,
    ])

    assertFolderIncludes(cloneDir, ['package.json', 'readme.md', 'src'])
})

Deno.test('GitCloneAction.execute should skip if dir already has content', async () => {
    const action = new GitCloneAction()
    const gitRepo = 'https://github.com/begin-examples/deno-hello-world.git'
    const dirWithContent = TestHelper.getNewTempDir()
    const fileInDir = path.join(dirWithContent, 'abc.txt')
    ensureFileSync(fileInDir)

    await action.execute(undefined, [
        gitRepo,
        dirWithContent,
    ])

    assertDirCount(dirWithContent, 1)
    assertFolderDoesNotInclude(dirWithContent, ['package.json', 'readme.md', 'src'])
})
