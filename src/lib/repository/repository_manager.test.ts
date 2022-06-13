import RepositoryManager from "./repository_manager.ts";
import Config from "../config.ts";
import TestHelper from "../test/test_helper.ts";
import {assert, assertEquals} from "https://deno.land/std/testing/asserts.ts";

Deno.test({
    name: 'RepositoryManager.init should prepare repos for package resolving',
    // only: true,
    fn: async () => {
        // await TestHelper.logToConsole()
        const repositoryManager = await getInitializedRepositoryManager()
        const repo = repositoryManager.repository
        const myPackage = repo.resolvePackage('superDuper')

        assertEquals(myPackage?.name, 'superDuper')
    }
})
Deno.test('RepositoryManager.repoList should list repos without repetition', async () => {
    const repositoryManager = await getInitializedRepositoryManager()
    const repos = await repositoryManager.repoList(false)

    assertEquals(repos.length, 2)
    assert(repos[0].endsWith('levain'))
    assert(repos[1].endsWith('repository_manager/extraRepo'))
})
Deno.test({
    name: 'RepositoryManager.initRepositories should init without repetition',
    // only: true,
    fn: async () => {
        const repositoryManager = await getInitializedRepositoryManager()

        const initializedRepositoriesPaths = repositoryManager?.repositories?.describe()
            || []

        assertEquals(initializedRepositoriesPaths,
            `currentDir: CacheRepo (FileSystemRepo (/Users/rafaelwalter/git.repo/levain))\n`
            + `installed: CacheRepo (FileSystemRepo (/Users/rafaelwalter/levain/.levain/registry))\n`
            + `regular: CacheRepo (ChainRepo (FileSystemRepo (/Users/rafaelwalter/git.repo/levain), FileSystemRepo (/Users/rafaelwalter/git.repo/levain/testdata/repository_manager/extraRepo)))\n`
        )
    },
})

async function getInitializedRepositoryManager() {
    const config = new Config()
    const repositoryManager = new RepositoryManager(config)

    await repositoryManager.init({
        extraRepos: [TestHelper.getTestDataPath('repository_manager/extraRepo')],
        tempRepos: [],
    })
    return repositoryManager;
}

//
// RepositoryManager.createCurrentDirRepo
//
Deno.test('RepositoryManager.createCurrentDirRepo should user currentDir', async () => {
    const config = new Config()
    const repositoryManager = new RepositoryManager(config)

    const repo = await repositoryManager.createCurrentDirRepo()

    const currentDir = Deno.cwd()
    assertEquals(repo.describe(), `CacheRepo (FileSystemRepo (${currentDir}))`)
    assertEquals(repo.initialized(), true)
})
//
// RepositoryManager.createInstalledDirRepo
//
Deno.test('RepositoryManager.createInstalledRepo should user registryDir', async () => {
    const config = new Config()
    const repositoryManager = new RepositoryManager(config)

    const repo = await repositoryManager.createInstalledRepo()

    const registryDir = config.levainRegistryDir
    assertEquals(repo.describe(), `CacheRepo (FileSystemRepo (${registryDir}))`)
    assertEquals(repo.initialized(), true)
})
//
// RepositoryManager.createInstalledDirRepo
//
Deno.test('RepositoryManager.createRegularRepositories should use levainSrcDir', async () => {
    const config = new Config()
    const repositoryManager = new RepositoryManager(config)

    const repo = await repositoryManager.createRegularRepositories()

    const repoDir = config.levainSrcDir
    assertEquals(repo.describe(), `CacheRepo (FileSystemRepo (${repoDir}))`)
    assertEquals(repo.initialized(), true)
})
Deno.test('RepositoryManager.createRegularRepositories should add tempRepos and extraRepos', async () => {
    const config = new Config()
    const repositoryManager = new RepositoryManager(config)

    const tempRepoDir = TestHelper.getTestDataPath('repository_manager/tempRepo');
    const tempRepos = [tempRepoDir]

    const extraRepoDir = TestHelper.getTestDataPath('repository_manager/extraRepo');
    const extraRepos = [extraRepoDir]


    await repositoryManager.init({extraRepos, tempRepos})
    const repo = await repositoryManager.createRegularRepositories()


    const repoDir = config.levainSrcDir
    assertEquals(repo.describe(), `CacheRepo (ChainRepo (FileSystemRepo (${repoDir}), FileSystemRepo (${tempRepoDir}), FileSystemRepo (${extraRepoDir})))`)
    assertEquals(repo.initialized(), true)
})
