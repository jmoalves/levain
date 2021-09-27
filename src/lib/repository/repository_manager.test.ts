import RepositoryManager from "./repository_manager.ts";
import Config from "../config.ts";
import TestHelper from "../test/test_helper.ts";
import {assert, assertEquals} from "https://deno.land/std/testing/asserts.ts";

Deno.test('RepositoryManager.init should prepare repos for package resolving', async () => {
    const repositoryManager = await getInitializedRepositoryManager()
    const repo = repositoryManager.repository
    const myPackage = repo.resolvePackage('superDuper')

    assertEquals(myPackage?.name, 'superDuper')
})

Deno.test('RepositoryManager.repoList should list repos without repetition', async () => {
    const repositoryManager = await getInitializedRepositoryManager()
    const repos = await repositoryManager.repoList(false)

    assertEquals(repos.length, 2)
    assert(repos[0].endsWith('levain'))
    assert(repos[1].endsWith('repository_manager/repo'))
})
Deno.test({
    name: 'RepositoryManager.initRepositories should init Without repetition',
    // only: true,
    fn: async () => {
        const repositoryManager = await getInitializedRepositoryManager()

        const initializedRepositoriesPaths = repositoryManager?.initializedRepositories
                ?.map(repo => repo.describe())
            || []

        assertEquals(initializedRepositoriesPaths?.length, 2)
        console.debug('initializedRepositoriesPaths', initializedRepositoriesPaths[0])
        assertEquals(initializedRepositoriesPaths, [
            "CacheRepo (ChainRepo (FileSystemRepo (/Users/rafaelwalter/git.repo/levain), FileSystemRepo (/Users/rafaelwalter/git.repo/levain/testdata/repository_manager/repo)))",
            "CacheRepo (ChainRepo (FileSystemRepo (/Users/rafaelwalter/levain/.levain/registry)))",
        ])
    },
})

async function getInitializedRepositoryManager() {
    const config = new Config()
    const repositoryManager = new RepositoryManager(config)

    await repositoryManager.init({
        repos: [TestHelper.getTestDataPath('repository_manager/repo')],
        tempRepos: [],
    })
    return repositoryManager;
}
