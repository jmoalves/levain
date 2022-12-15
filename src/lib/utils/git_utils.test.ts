import {
    assert,
    assertEquals,
    assertMatch,
    assertThrows,
    assertRejects
} from "https://deno.land/std/testing/asserts.ts";

import GitUtils from "./git_utils.ts";
import TestHelper from "../test/test_helper.ts";
import {assertDirCountGreaterOrEqualTo} from "../test/more_asserts.ts";

const validUrls = [
    "git@github.com:jmoalves/levain.git",
    "https://github.com/jmoalves/levain.git",
    "git@github.com:jmoalves/levain.git#master",
    "git@github.com:jmoalves/levain.git#develop",
    "git@github.com:jmoalves/levain.git#some-branch-name",
    "git@github.com:jmoalves/levain.git#some_branch_name",
    "https://github.com/jmoalves/levain.git#develop",
    "git@gitlab.bndes.net:sist-pme/pme.git",
    "https://gitlab.bndes.net/sist-pme/pme.git",
    "git@gitlab.com:scout-manager/scout-manager-app.git",
    "https://gitlab.com/scout-manager/scout-manager-app.git",
]
validUrls.forEach(gitPath => {
    Deno.test(`GitUtils - isGitPath(${gitPath})`, () => {
        assert(GitUtils.isGitPath(gitPath))
    })
})

const invalidUrls = [
    "C:\\test\\gitfile",
    "https://my.git.com/file.git.cmd",
]
invalidUrls.forEach(gitPath => {
    Deno.test(`GitUtils - isGitPath(${gitPath})`, () => {
        assert(!GitUtils.isGitPath(gitPath))
    })
})

Deno.test(`GitUtils - parseGitPath('git@github.com:jmoalves/levain.git#develop')`, () => {
    let gitPath = GitUtils.parseGitPath('git@github.com:jmoalves/levain.git#develop')
    assertEquals(gitPath.url, 'git@github.com:jmoalves/levain.git')
    assertEquals(gitPath.branch, 'develop')
    assertEquals(gitPath.user, 'jmoalves')
    assertEquals(gitPath.repo, 'levain')
})

Deno.test(`GitUtils - parseGitPath('git@github.com:jmoalves/levain.git')`, () => {
    let gitPath = GitUtils.parseGitPath('git@github.com:jmoalves/levain.git')
    assertEquals(gitPath.url, 'git@github.com:jmoalves/levain.git')
    assertEquals(gitPath.branch, undefined)
    assertEquals(gitPath.user, 'jmoalves')
    assertEquals(gitPath.repo, 'levain')
})

Deno.test(`GitUtils - parseGitPath('git@gitlab.bndes.net:sist-pme/pme.git#develop')`, () => {
    let gitPath = GitUtils.parseGitPath('git@gitlab.bndes.net:sist-pme/pme.git#develop')
    assertEquals(gitPath.url, 'git@gitlab.bndes.net:sist-pme/pme.git')
    assertEquals(gitPath.branch, 'develop')
    assertEquals(gitPath.user, 'sist-pme')
    assertEquals(gitPath.repo, 'pme')
})

Deno.test(`GitUtils - parseGitPath('git@gitlab.bndes.net:sist-pme/pme.git')`, () => {
    let gitPath = GitUtils.parseGitPath('git@gitlab.bndes.net:sist-pme/pme.git')
    assertEquals(gitPath.url, 'git@gitlab.bndes.net:sist-pme/pme.git')
    assertEquals(gitPath.branch, undefined)
    assertEquals(gitPath.user, 'sist-pme')
    assertEquals(gitPath.repo, 'pme')
})

Deno.test(`GitUtils - parseGitPath('https://github.com/jmoalves/levain.git#develop')`, () => {
    let gitPath = GitUtils.parseGitPath('https://github.com/jmoalves/levain.git#develop')
    assertEquals(gitPath.url, 'https://github.com/jmoalves/levain.git')
    assertEquals(gitPath.branch, 'develop')
    assertEquals(gitPath.user, 'jmoalves')
    assertEquals(gitPath.repo, 'levain')
})

Deno.test(`GitUtils - parseGitPath('https://github.com/jmoalves/levain.git')`, () => {
    let gitPath = GitUtils.parseGitPath('https://github.com/jmoalves/levain.git')
    assertEquals(gitPath.url, 'https://github.com/jmoalves/levain.git')
    assertEquals(gitPath.branch, undefined)
    assertEquals(gitPath.user, 'jmoalves')
    assertEquals(gitPath.repo, 'levain')
})

Deno.test(`GitUtils - parseGitPath('https://gitlab.bndes.net/sist-pme/pme.git#develop')`, () => {
    let gitPath = GitUtils.parseGitPath('https://gitlab.bndes.net/sist-pme/pme.git#develop')
    assertEquals(gitPath.url, 'https://gitlab.bndes.net/sist-pme/pme.git')
    assertEquals(gitPath.branch, 'develop')
    assertEquals(gitPath.user, 'sist-pme')
    assertEquals(gitPath.repo, 'pme')
})

Deno.test(`GitUtils - parseGitPath('https://gitlab.bndes.net/sist-pme/pme.git')`, () => {
    let gitPath = GitUtils.parseGitPath('https://gitlab.bndes.net/sist-pme/pme.git')
    assertEquals(gitPath.url, 'https://gitlab.bndes.net/sist-pme/pme.git')
    assertEquals(gitPath.branch, undefined)
    assertEquals(gitPath.user, 'sist-pme')
    assertEquals(gitPath.repo, 'pme')
})

Deno.test(`GitUtils - localBaseDir()`, () => {
    assertEquals(GitUtils.localBaseDir('git@github.com:jmoalves/levain.git'), 'git_github.com_jmoalves_levain')
    assertEquals(GitUtils.localBaseDir('git@github.com:jmoalves/levain.git#develop'), 'git_github.com_jmoalves_levain_develop')
    assertEquals(GitUtils.localBaseDir('https://gitlab.com/scout-manager/scout-manager-app.git'), 'https_gitlab.com_scout-manager_scout-manager-app')
    assertEquals(GitUtils.localBaseDir('https://gitlab.com/scout-manager/scout-manager-app.git#develop'), 'https_gitlab.com_scout-manager_scout-manager-app_develop')
})
Deno.test('GitUtils.checkGitPath should throw error if url is invalid', () => {
    assertThrows(() => {
            GitUtils.checkGitPath('thisFolderDoesNotExist')
        },
        Error,
        'Invalid git url - thisFolderDoesNotExist',
    )
})
Deno.test('GitUtils.localBaseDir should throw error if url is invalid', () => {
    assertThrows(() => {
            GitUtils.localBaseDir('thisFolderDoesNotExist')
        },
        Error,
        'Invalid git url - thisFolderDoesNotExist',
    )
})

Deno.test('GitUtils.clone should throw error if url is invalid', async () => {
    await assertRejects(
        async () => {
            await new GitUtils().clone('thisSourceDoesNotExist', 'thisDstDoesNotExist')
        },
        Error,
        'Invalid git url - thisSourceDoesNotExist',
    )
})
Deno.test('GitUtils.checkGitPath should throw error if url is invalid', () => {
    assertThrows(() => {
            GitUtils.checkGitPath('thisFolderDoesNotExist')
        },
        Error,
        'Invalid git url - thisFolderDoesNotExist',
    )
})
Deno.test('GitUtils.localBaseDir should throw error if url is invalid', () => {
    assertThrows(() => {
            GitUtils.localBaseDir('thisFolderDoesNotExist')
        },
        Error,
        'Invalid git url - thisFolderDoesNotExist',
    )
})
Deno.test('GitUtils.clone should throw error if url is invalid', async () => {
    await assertRejects(
        async () => {
            await new GitUtils().clone('thisSourceDoesNotExist', 'thisDstDoesNotExist')
        },
        Error,
        'Invalid git url - thisSourceDoesNotExist',
    )
})
Deno.test('GitUtils.checkGitPath should throw error if url is invalid', () => {
    assertThrows(() => {
            GitUtils.checkGitPath('thisFolderDoesNotExist')
        },
        Error,
        'Invalid git url - thisFolderDoesNotExist',
    )
})
Deno.test('GitUtils.localBaseDir should throw error if url is invalid', () => {
    assertThrows(() => {
            GitUtils.localBaseDir('thisFolderDoesNotExist')
        },
        Error,
        'Invalid git url - thisFolderDoesNotExist',
    )
})
Deno.test('GitUtils.clone should throw error if url is invalid', async () => {
    await assertRejects(
        async () => {
            await new GitUtils().clone('thisSourceDoesNotExist', 'thisDstDoesNotExist')
        },
        Error,
        'Invalid git url - thisSourceDoesNotExist',
    )
})
Deno.test('GitUtils.clone should clone a repo', async () => {
    const tempFolder = TestHelper.getNewTempDir()
    const gitRepo = 'https://github.com/begin-examples/deno-hello-world.git'

    await new GitUtils().clone(gitRepo, tempFolder)

    assertDirCountGreaterOrEqualTo(tempFolder, 3)
})
Deno.test({
    name: 'GitUtils.pull should pull a repo',
    fn: async () => {
        const tempFolder = TestHelper.getNewTempDir()
        const gitRepo = 'https://github.com/begin-examples/deno-hello-world.git'

        const gitUtils = new GitUtils();
        await gitUtils.clone(gitRepo, tempFolder)
        await gitUtils.pull(tempFolder)

        assertDirCountGreaterOrEqualTo(tempFolder, 3)
    },
})
Deno.test({
    name: 'GitUtils.pull should throw an error if folder is not a git repo',
    fn: async () => {
        const testLogger = await TestHelper.setupTestLogger()

        const folder = TestHelper.folderThatAlwaysExists
        const gitUtils = new GitUtils()

        await assertRejects(
            async () => {
                await gitUtils.pull(folder)
            },
            Error,
            'Unable to GIT PULL',
        )

        const lastMessage = testLogger.messages[testLogger.messages.length - 1]
        assertMatch(lastMessage, /^ERROR git error - try 3 - Error 128/m)
        assertMatch(lastMessage, /fatal: not a git repository \(or any of the parent directories\): .git/)
    },
})
