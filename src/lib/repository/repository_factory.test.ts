import RepositoryFactory from "./repository_factory.ts";
import Config from "../config.ts";
import TestHelper from "../test/test_helper.ts";
import { assert, assertNotEquals } from "@std/assert";

Deno.test("RepositoryFactory.getOrCreate should return same repository for the same uri", async () => {
  const config = new Config();
  const repoPath = TestHelper.getTestDataPath("repository_factory/repo");
  const repo1 = await RepositoryFactory.getOrCreate(config, repoPath);
  const repo2 = await RepositoryFactory.getOrCreate(config, repoPath);

  assert(repo1 === repo2);
});
Deno.test("RepositoryFactory.getOrCreate should return same repository object for different factories", async () => {
  const config = new Config();
  const repoPath = TestHelper.getTestDataPath("repository_factory/repo");
  const repo1 = await RepositoryFactory.getOrCreate(config, repoPath);
  const repo2 = await RepositoryFactory.getOrCreate(config, repoPath);

  assert(repo1 === repo2);
});
Deno.test("RepositoryFactory.getOrCreate should return different repository for the different uri", async () => {
  const config = new Config();
  const repoPath1 = TestHelper.getTestDataPath("repository_factory/repo");
  const repoPath2 = TestHelper.getTestDataPath("repository_factory/another_repo");
  const repo1 = await RepositoryFactory.getOrCreate(config, repoPath1);
  const repo2 = await RepositoryFactory.getOrCreate(config, repoPath2);

  assertNotEquals(repo1, repo2);
});
Deno.test("RepositoryFactory.getOrCreate should handout initialized repos", async () => {
  const config = new Config();
  const repoPath1 = TestHelper.getTestDataPath("repository_factory/repo");
  const repo1 = await RepositoryFactory.getOrCreate(config, repoPath1);
  assert(repo1.initialized());
});
