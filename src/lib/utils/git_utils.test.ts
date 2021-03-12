import {assert, assertEquals} from "https://deno.land/std/testing/asserts.ts";

import GitUtils from "./git_utils.ts";

const validUrls = [
    "git@github.com:jmoalves/levain.git",
    "https://github.com/jmoalves/levain.git",
    "git@github.com:jmoalves/levain.git#master",
    "git@github.com:jmoalves/levain.git#develop",
    "git@github.com:jmoalves/levain.git#some-branch-name",
    "git@github.com:jmoalves/levain.git#some_branch_name",
    "https://github.com/jmoalves/levain.git#develop",
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
})

Deno.test(`GitUtils - parseGitPath('git@github.com:jmoalves/levain.git')`, () => {
    let gitPath = GitUtils.parseGitPath('git@github.com:jmoalves/levain.git')
    assertEquals(gitPath.url, 'git@github.com:jmoalves/levain.git')
    assertEquals(gitPath.branch, undefined)
})

Deno.test(`GitUtils - localBaseDir()`, () => {
    assertEquals(GitUtils.localBaseDir('git@github.com:jmoalves/levain.git'), 'git_github.com_jmoalves_levain')
    assertEquals(GitUtils.localBaseDir('git@github.com:jmoalves/levain.git#develop'), 'git_github.com_jmoalves_levain_develop')
    assertEquals(GitUtils.localBaseDir('https://gitlab.com/scout-manager/scout-manager-app.git'), 'https_gitlab.com_scout-manager_scout-manager-app')
    assertEquals(GitUtils.localBaseDir('https://gitlab.com/scout-manager/scout-manager-app.git#develop'), 'https_gitlab.com_scout-manager_scout-manager-app_develop')
})
