import RepositoryManager from "./repository_manager.ts";
import Config from "../config.ts";
import TestHelper from "../test/test_helper.ts";
import {assert, assertEquals} from "https://deno.land/std/testing/asserts.ts";

Deno.test('RepositoryManager.init should prepare repos for package resolving', async () => {
    const config = new Config()
    const repositoryManager = new RepositoryManager(config)

    await repositoryManager.init({
        repos: [],
        tempRepos: [TestHelper.getTestDataPath('repository_manager/repo')],
    })
    const repo = repositoryManager.repository
    const myPackage = repo.resolvePackage('superDuper')

    assertEquals(myPackage?.name, 'superDuper')
})
Deno.test('RepositoryManager.repoList should list repos without repetition', async () => {
    const config = new Config()
    const repositoryManager = new RepositoryManager(config)

    await repositoryManager.init({
        repos: [TestHelper.getTestDataPath('repository_manager/repo')],
        tempRepos: [],
    })
    const repos = await repositoryManager.repoList(false)

    assertEquals(repos.length, 2)
    assert(repos[0].endsWith('levain'))
    assert(repos[1].endsWith('repository_manager/repo'))
})
// Deno.test('RepositoryManager.initRepositories should init Without repetition', async () => {
//     fail()
// })
