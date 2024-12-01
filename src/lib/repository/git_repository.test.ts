import Repository from "./repository.ts";
import Config from "../config.ts";

import {assertEquals, assertRejects,} from "jsr:@std/assert";
import GitRepository from "./git_repository.ts";
import LevainAsserts from "../test/levain_asserts.ts";

Deno.test('GitRepository should have a name', () => {
    const repo = getRepo()

    assertEquals(repo.name, 'GitRepo')
})
const gitRootUrl = 'https://github.com/jmoalves/levain-pkgs.git'
Deno.test('GitRepository should have a absoluteURI', () => {
    const repo = getRepo()

    assertEquals(repo.absoluteURI, gitRootUrl)
})
Deno.test('GitRepository should have a description', () => {
    const repo = getRepo()

    assertEquals(repo.describe(), `GitRepo (https://github.com/jmoalves/levain-pkgs.git)`)
})
Deno.test({
    name: 'GitRepository should throw an error when root url is invalid',
    fn: async () => {
        const rootUrl = 'thisFolderDoesNotExist'
        await assertRejects(
            async () => {
                const repo = await getRepo(rootUrl)
                await repo.init()
            },
            Error,
            `Invalid git url - ${rootUrl}`,
        )
    },
})
//
// List
//
Deno.test('GitRepository should list packages from git url', async () => {
    const repo = await getInitedRepo()

    const packages = repo.listPackages()

    LevainAsserts.assertContainsPackageNames(packages, [
        'git',
        'deno',
        'maven-3.6',
        'openjdk-11',
    ])
})
//
// helpers
//
async function getInitedRepo(rootDir: string = gitRootUrl): Promise<Repository> {
    const repo = getRepo(rootDir)
    await repo.init()
    return repo
}

function getRepo(rootDir: string = gitRootUrl) {
    return new GitRepository(new Config([]), rootDir)
}
