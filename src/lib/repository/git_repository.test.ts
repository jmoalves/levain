import Repository from "./repository.ts";

import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import * as path from "@std/path";
import { stub } from "@std/testing/mock";
import { GitRepository } from "./git_repository.ts";
import GitUtils from "../utils/git_utils.ts";
import LevainAsserts from "../test/levain_asserts.ts";
import TestHelper from "../test/test_helper.ts";

Deno.test("GitRepository should have a name", () => {
  const repo = getRepo();

  assertEquals(repo.name, "GitRepo");
});
const gitRootUrl = "https://github.com/jmoalves/levain-pkgs.git";
Deno.test("GitRepository should have a absoluteURI", () => {
  const repo = getRepo();

  assertEquals(repo.absoluteURI, gitRootUrl);
});
Deno.test("GitRepository should have a description", () => {
  const repo = getRepo();

  assertEquals(repo.describe(), `GitRepo (https://github.com/jmoalves/levain-pkgs.git)`);
});
Deno.test({
  name: "GitRepository should throw an error when root url is invalid",
  fn: async () => {
    const rootUrl = "thisFolderDoesNotExist";
    await assertRejects(
      async () => {
        const repo = await getRepo(rootUrl);
        await repo.init();
      },
      Error,
      `Invalid git url - ${rootUrl}`,
    );
  },
});
//
// List
//
Deno.test("GitRepository should list packages from git url", async () => {
  const localGitRepo = await TestHelper.createLocalGitRepo({
    "recipes/git.levain.yaml": "version: 1.0.0\n",
    "recipes/deno.levain.yaml": "version: 1.0.0\n",
    "recipes/maven-3.6.levain.yaml": "version: 3.6.3\n",
    "recipes/openjdk-11.levain.yaml": "version: 11.0.0\n",
  });
  const repo = await getInitedRepo(localGitRepo);

  const packages = repo.listPackages();

  LevainAsserts.assertContainsPackageNames(packages, [
    "git",
    "deno",
    "maven-3.6",
    "openjdk-11",
  ]);
});

Deno.test("GitRepository should skip git update within TTL and update when TTL is 0", async () => {
  const localGitRepo = await TestHelper.createLocalGitRepo({
    "recipes/git.levain.yaml": "version: 1.0.0\n",
  });
  const config = TestHelper.getConfig();
  const prevTtl = Deno.env.get("LEVAIN_GIT_UPDATE_TTL_SECONDS");

  // First init clones the repository
  const repo1 = new GitRepository(config, localGitRepo);
  await repo1.init();

  const updateStub = stub(GitUtils.prototype, "update", () => Promise.resolve());
  try {
    // Within default 60s TTL -> update is skipped
    Deno.env.delete("LEVAIN_GIT_UPDATE_TTL_SECONDS");
    const repo2 = new GitRepository(config, localGitRepo);
    await repo2.init();
    assertEquals(updateStub.calls.length, 0);

    // forceRefresh=true (e.g. `levain update`) bypasses TTL
    const repoForced = new GitRepository(config, localGitRepo, false, true);
    await repoForced.init();
    assertEquals(updateStub.calls.length, 1);

    // With TTL=0 -> update is executed
    Deno.env.set("LEVAIN_GIT_UPDATE_TTL_SECONDS", "0");
    const repo3 = new GitRepository(config, localGitRepo);
    await repo3.init();
    assertEquals(updateStub.calls.length, 2);

    // Invalid TTL falls back to default (60s -> skips update)
    Deno.env.set("LEVAIN_GIT_UPDATE_TTL_SECONDS", "invalid");
    assertEquals(GitRepository.updateTtlSeconds(), GitRepository.DEFAULT_UPDATE_TTL_SECONDS);
    Deno.env.set("LEVAIN_GIT_UPDATE_TTL_SECONDS", "-5");
    assertEquals(GitRepository.updateTtlSeconds(), GitRepository.DEFAULT_UPDATE_TTL_SECONDS);
  } finally {
    updateStub.restore();
    if (prevTtl === undefined) {
      Deno.env.delete("LEVAIN_GIT_UPDATE_TTL_SECONDS");
    } else {
      Deno.env.set("LEVAIN_GIT_UPDATE_TTL_SECONDS", prevTtl);
    }
  }
});
//
// helpers
//
async function getInitedRepo(rootDir: string): Promise<Repository> {
  const repo = getRepo(rootDir);
  await repo.init();
  return repo;
}

function getRepo(rootDir: string = gitRootUrl) {
  return new GitRepository(TestHelper.getConfig(), rootDir);
}

Deno.test("GitRepository throws before init, handles stale TTL, ignores update error, and supports resolvePackage and reload", async () => {
  const uninited = getRepo();
  assertThrows(() => uninited.listPackages(), Error, "GitRepo not loaded");
  assertThrows(() => uninited.resolvePackage("git"), Error, "GitRepo not loaded");

  const localGitRepo = await TestHelper.createLocalGitRepo({
    "recipes/git.levain.yaml": "version: 1.0.0\n",
  });
  const config = TestHelper.getConfig();
  const repo = new GitRepository(config, localGitRepo);
  await repo.init();
  assertEquals(repo.resolvePackage("git")?.name, "git");
  await repo.reload();

  // Age HEAD/FETCH_HEAD past TTL so isWithinUpdateTtl returns false, and verify update errors are ignored
  const localDir = path.resolve(config.configPaths.levainConfigDir, "gitRepos", GitUtils.localBaseDir(localGitRepo));
  const oldDate = new Date(Date.now() - 5 * 60 * 1000);
  for (const marker of ["FETCH_HEAD", "HEAD"]) {
    const markerPath = path.join(localDir, ".git", marker);
    try {
      Deno.utimeSync(markerPath, oldDate, oldDate);
    } catch {
      // FETCH_HEAD may not exist on fresh clone
    }
  }

  const failingUpdateStub = stub(GitUtils.prototype, "update", () => Promise.reject(new Error("offline")));
  try {
    const repo2 = new GitRepository(config, localGitRepo);
    await repo2.init();
    assertEquals(failingUpdateStub.calls.length, 1);
    assertEquals(repo2.resolvePackage("git")?.name, "git");

    // Missing markers (.git removed) also triggers update
    await Deno.remove(path.join(localDir, ".git"), { recursive: true });
    const repo3 = new GitRepository(config, localGitRepo);
    await repo3.init();
    assertEquals(failingUpdateStub.calls.length, 2);
  } finally {
    failingUpdateStub.restore();
  }
});
