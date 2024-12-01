import RepositoryManager from "./repository_manager.ts";
import Config from "../config.ts";
import TestHelper from "../test/test_helper.ts";
import {assert, assertEquals} from "jsr:@std/assert";

Deno.test({
    name: 'RepositoryManager.init should prepare repos for package resolving',
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
    assert(repos[0].match(/levain$/), "repos[0] does not end with 'levain'")
    assert(repos[1].match(/repository_manager(\/|\\)extraRepo$/), "repos[1] does not contain extraRepo")
})

async function getInitializedRepositoryManager() {
    const config = new Config()
    const repositoryManager = new RepositoryManager(config)

    await repositoryManager.init({
        extraRepos: [TestHelper.getTestDataPath('repository_manager/extraRepo'), TestHelper.getTestDataPath('repository_manager/extraRepo')],
        tempRepos: [],
    })

    return repositoryManager;
}

Deno.test('RepositoryManager.createCurrentDirRepo should user currentDir', async () => {
    const config = new Config()
    const repositoryManager = new RepositoryManager(config)

    const repo = await repositoryManager.createCurrentDirRepo()

    const currentDir = Deno.cwd()

    assert(repo.describe().match(TestHelper.pathRegExp(currentDir, { ignoreCase: true})), "repo does not contain currentDir")
    assertEquals(repo.initialized(), true)
})

Deno.test('RepositoryManager.createInstalledRepo should user registryDir', async () => {
    const config = new Config()
    const repositoryManager = new RepositoryManager(config)

    const repo = await repositoryManager.createInstalledRepo()

    const registryDir = config.levainRegistryDir
    assert(repo.describe().match(TestHelper.pathRegExp(registryDir, { ignoreCase: true})), "repo does not contain registryDir")
    assertEquals(repo.initialized(), true)
})

Deno.test('RepositoryManager.createRegularRepositories should use levainSrcDir', async () => {
    const config = new Config()
    const repositoryManager = new RepositoryManager(config)

    const repo = await repositoryManager.createRegularRepositories()

    const repoDir = config.levainSrcDir
    assert(repo.describe().match(TestHelper.pathRegExp(repoDir, { ignoreCase: true})), "repoDir does not match levainSrcDir")
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
    assert(repo.describe().match(TestHelper.pathRegExp(repoDir, { ignoreCase: true})), "repo does not contain levainSrcDir")
    assert(repo.describe().match(TestHelper.pathRegExp(tempRepoDir, { ignoreCase: true})), "repo does not contain tempRepoDir")
    assert(repo.describe().match(TestHelper.pathRegExp(extraRepoDir, { ignoreCase: true})), "repo does not contain extraRepoDir")
    assertEquals(repo.initialized(), true)
})
