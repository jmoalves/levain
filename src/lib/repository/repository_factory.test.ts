import RepositoryFactory from "./repository_factory.ts";
import Config from "../config.ts";
import TestHelper from "../test/test_helper.ts";
import {assert, assertNotEquals} from "https://deno.land/std/assert/mod.ts";

Deno.test('RepositoryFactory.getOrCreate should return same repository for the same uri', async () => {
    const config = new Config()
    const repoFactory = new RepositoryFactory(config)
    const repoPath = TestHelper.getTestDataPath('repository_factory/repo')
    const repo1 = await repoFactory.getOrCreate(repoPath)
    const repo2 = await repoFactory.getOrCreate(repoPath)

    assert(repo1 === repo2)
})
Deno.test('RepositoryFactory.getOrCreate should return same repository object for different factories', async () => {
    const config = new Config()
    const repoFactory1 = new RepositoryFactory(config)
    const repoFactory2 = new RepositoryFactory(config)
    const repoPath = TestHelper.getTestDataPath('repository_factory/repo')
    const repo1 = await repoFactory1.getOrCreate(repoPath)
    const repo2 = await repoFactory2.getOrCreate(repoPath)

    assert(repo1 === repo2)
})
Deno.test('RepositoryFactory.getOrCreate should return different repository for the different uri', async () => {
    const config = new Config()
    const repoFactory = new RepositoryFactory(config)
    const repoPath1 = TestHelper.getTestDataPath('repository_factory/repo')
    const repoPath2 = TestHelper.getTestDataPath('repository_factory/another_repo')
    const repo1 = await repoFactory.getOrCreate(repoPath1)
    const repo2 = await repoFactory.getOrCreate(repoPath2)

    assertNotEquals(repo1, repo2)
})
Deno.test('RepositoryFactory.getOrCreate should handout initialized repos', async () => {
    const config = new Config()
    const repoFactory = new RepositoryFactory(config)
    const repoPath1 = TestHelper.getTestDataPath('repository_factory/repo')
    const repo1 = await repoFactory.getOrCreate(repoPath1)
    assert(repo1.initialized())
})
