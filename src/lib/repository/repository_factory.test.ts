import RepositoryFactory from "./repository_factory.ts";
import Config from "../config.ts";
import TestHelper from "../test/test_helper.ts";
import {assert, assertNotEquals} from "https://deno.land/std/testing/asserts.ts";

Deno.test('RepositoryFactory.getOrCreate should return same repository for the same uri', () => {
    const config = new Config()
    const repoFactory = new RepositoryFactory(config)
    const repoPath = TestHelper.getTestDataPath('repository_factory/repo')
    const repo1 = repoFactory.getOrCreate(repoPath)
    const repo2 = repoFactory.getOrCreate(repoPath)

    assert(repo1 === repo2)
})
Deno.test('RepositoryFactory.getOrCreate should return same repository object for different factories', () => {
    const config = new Config()
    const repoFactory1 = new RepositoryFactory(config)
    const repoFactory2 = new RepositoryFactory(config)
    const repoPath = TestHelper.getTestDataPath('repository_factory/repo')
    const repo1 = repoFactory1.getOrCreate(repoPath)
    const repo2 = repoFactory2.getOrCreate(repoPath)

    assert(repo1 === repo2)
})
Deno.test('RepositoryFactory.getOrCreate should return different repository for the different uri', () => {
    const config = new Config()
    const repoFactory = new RepositoryFactory(config)
    const repoPath1 = TestHelper.getTestDataPath('repository_factory/repo')
    const repoPath2 = TestHelper.getTestDataPath('repository_factory/another_repo')
    const repo1 = repoFactory.getOrCreate(repoPath1)
    const repo2 = repoFactory.getOrCreate(repoPath2)

    assertNotEquals(repo1, repo2)
})
