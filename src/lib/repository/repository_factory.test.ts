import RepositoryFactory from "./repository_factory.ts";
import TestHelper from "../test/test_helper.ts";
import { assert, assertNotEquals, assertNotStrictEquals } from "@std/assert";

Deno.test("RepositoryFactory.getOrCreate should return same repository for the same uri", async () => {
  const config = TestHelper.getConfig();
  const repoPath = TestHelper.getTestDataPath("repository_factory/repo");
  const repo1 = await RepositoryFactory.getOrCreate(config, repoPath);
  const repo2 = await RepositoryFactory.getOrCreate(config, repoPath);

  assert(repo1 === repo2);
});
Deno.test("RepositoryFactory.getOrCreate should return different repository for the different uri", async () => {
  const config = TestHelper.getConfig();
  const repoPath1 = TestHelper.getTestDataPath("repository_factory/repo");
  const repoPath2 = TestHelper.getTestDataPath("repository_factory/another_repo");
  const repo1 = await RepositoryFactory.getOrCreate(config, repoPath1);
  const repo2 = await RepositoryFactory.getOrCreate(config, repoPath2);

  assertNotEquals(repo1, repo2);
});
Deno.test("RepositoryFactory.getOrCreate should handout initialized repos", async () => {
  const config = TestHelper.getConfig();
  const repoPath1 = TestHelper.getTestDataPath("repository_factory/repo");
  const repo1 = await RepositoryFactory.getOrCreate(config, repoPath1);
  assert(repo1.initialized());
});

Deno.test("RepositoryFactory.getOrCreate should isolate cache per Config and rootOnly flag", async () => {
  const config1 = TestHelper.getConfig();
  const config2 = TestHelper.getConfig();
  const repoPath = TestHelper.getTestDataPath("repository_factory/repo");

  const repoCfg1Full = await RepositoryFactory.getOrCreate(config1, repoPath, false);
  const repoCfg1Root = await RepositoryFactory.getOrCreate(config1, repoPath, true);
  const repoCfg2Full = await RepositoryFactory.getOrCreate(config2, repoPath, false);

  assertNotStrictEquals(repoCfg1Full, repoCfg1Root);
  assertNotStrictEquals(repoCfg1Full, repoCfg2Full);
});

Deno.test("RepositoryFactory.getOrCreate should deduplicate concurrent in-flight initializations", async () => {
  const config = TestHelper.getConfig();
  const repoPath = TestHelper.getTestDataPath("repository_factory/repo");

  const [repoA, repoB] = await Promise.all([
    RepositoryFactory.getOrCreate(config, repoPath),
    RepositoryFactory.getOrCreate(config, repoPath),
  ]);

  assert(repoA === repoB);
});
