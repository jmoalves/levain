import * as path from "@std/path";
import RepositoryManager from "./repository_manager.ts";
import TestHelper from "../test/test_helper.ts";
import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { stub } from "@std/testing/mock";
import LevainPaths from "../paths/levain_paths.ts";
import { FileSystemRepository } from "./file_system_repository.ts";

Deno.test({
  name: "RepositoryManager.init should prepare repos for package resolving",
  fn: async () => {
    // await TestHelper.logToConsole()
    const repositoryManager = await getInitializedRepositoryManager();
    const repo = repositoryManager.repository;
    const myPackage = repo.resolvePackage("superDuper");

    assertEquals(myPackage?.name, "superDuper");
  },
});

Deno.test("RepositoryManager.repoList should list repos without repetition", async () => {
  const repositoryManager = await getInitializedRepositoryManager();
  const repos = await repositoryManager.repoList(false);

  assertEquals(repos.length, 2);
  assertEquals(repos[0], LevainPaths.levainSrcDir);
  assert(repos[1].match(/repository_manager(\/|\\)extraRepo$/), "repos[1] does not contain extraRepo");
});

async function getInitializedRepositoryManager() {
  const config = TestHelper.getConfig();
  const repositoryManager = new RepositoryManager(config);

  await repositoryManager.init({
    extraRepos: [
      TestHelper.getTestDataPath("repository_manager/extraRepo"),
      TestHelper.getTestDataPath("repository_manager/extraRepo"),
    ],
    tempRepos: [],
  });

  return repositoryManager;
}

Deno.test("RepositoryManager.createCurrentDirRepo should user currentDir", async () => {
  const config = TestHelper.getConfig();
  const repositoryManager = new RepositoryManager(config);

  const repo = await repositoryManager.createCurrentDirRepo();

  const currentDir = Deno.cwd();

  assert(
    repo.describe().match(TestHelper.pathRegExp(currentDir, { ignoreCase: true })),
    "repo does not contain currentDir",
  );
  assertEquals(repo.initialized(), true);
});

Deno.test("RepositoryManager.createInstalledRepo should user registryDir", async () => {
  const config = TestHelper.getConfig();
  const repositoryManager = new RepositoryManager(config);
  const registryDir = config.configPaths.levainRegistryDir;

  // When registryDir does not exist yet, createInstalledRepo stays side-effect-free and returns EmptyRepository
  const emptyRepo = await repositoryManager.createInstalledRepo();
  assertEquals(emptyRepo.name, "EmptyRepo");

  Deno.mkdirSync(registryDir, { recursive: true });
  const repo = await repositoryManager.createInstalledRepo();

  assert(
    repo.describe().match(TestHelper.pathRegExp(registryDir, { ignoreCase: true })),
    "repo does not contain registryDir",
  );
  assertEquals(repo.initialized(), true);
});

Deno.test("RepositoryManager.createRegularRepositories should use levainSrcDir", async () => {
  const config = TestHelper.getConfig();
  const repositoryManager = new RepositoryManager(config);

  const repo = await repositoryManager.createRegularRepositories();

  const repoDir = LevainPaths.levainSrcDir;
  assert(
    repo.describe().match(TestHelper.pathRegExp(repoDir, { ignoreCase: true })),
    "repoDir does not match levainSrcDir",
  );
  assertEquals(repo.initialized(), true);
});

Deno.test("RepositoryManager.createRegularRepositories should add tempRepos and extraRepos", async () => {
  const config = TestHelper.getConfig();
  const repositoryManager = new RepositoryManager(config);

  const tempRepoDir = TestHelper.getTestDataPath("repository_manager/tempRepo");
  const tempRepos = [tempRepoDir];

  const extraRepoDir = TestHelper.getTestDataPath("repository_manager/extraRepo");
  const extraRepos = [extraRepoDir];

  await repositoryManager.init({ extraRepos, tempRepos });
  const repo = await repositoryManager.createRegularRepositories();

  const repoDir = LevainPaths.levainSrcDir;
  assert(
    repo.describe().match(TestHelper.pathRegExp(repoDir, { ignoreCase: true })),
    "repo does not contain levainSrcDir",
  );
  assert(
    repo.describe().match(TestHelper.pathRegExp(tempRepoDir, { ignoreCase: true })),
    "repo does not contain tempRepoDir",
  );
  assert(
    repo.describe().match(TestHelper.pathRegExp(extraRepoDir, { ignoreCase: true })),
    "repo does not contain extraRepoDir",
  );
  assertEquals(repo.initialized(), true);
});

Deno.test("RepositoryManager.reload should await repo.reload on all managed repositories", async () => {
  const config = TestHelper.getConfig();
  const repositoryManager = new RepositoryManager(config);
  const tempRepo = TestHelper.getNewTempDir();
  await Deno.writeTextFile(path.join(tempRepo, "initial.levain.yaml"), "version: 1.0.0\n");

  await repositoryManager.init({ extraRepos: [], tempRepos: [tempRepo] });
  assert(repositoryManager.repository.resolvePackage("initial"));
  assertEquals(repositoryManager.repository.resolvePackage("added-later"), undefined);

  await Deno.writeTextFile(path.join(tempRepo, "added-later.levain.yaml"), "version: 1.0.0\n");
  await repositoryManager.reload();

  assert(repositoryManager.repository.resolvePackage("added-later"));
});

Deno.test("RepositoryManager.reloadInstalled refreshes newly created and existing registry without reloading regular repos", async () => {
  const config = TestHelper.getConfig();
  const rm = new RepositoryManager(config);
  const tempRepo = TestHelper.getNewTempDir();
  await Deno.writeTextFile(path.join(tempRepo, "regular-pkg.levain.yaml"), "version: 1.0.0\n");

  await rm.init({ extraRepos: [], tempRepos: [tempRepo] });
  assertEquals(rm.repositoryInstalled.name, "EmptyRepo");

  // Track reload on regular repository to prove reloadInstalled does not touch it
  const regularReloadStub = stub(rm.repository, "reload", () => Promise.resolve());
  try {
    // 1. Registry dir created during first install -> EmptyRepo replaced by FileSystemRepo
    const registryDir = config.configPaths.levainRegistryDir;
    await Deno.mkdir(registryDir, { recursive: true });
    await Deno.writeTextFile(path.join(registryDir, "first-pkg.levain.yaml"), "version: 1.0.0\n");
    await rm.reloadInstalled();
    assertEquals(rm.repositoryInstalled.resolvePackage("first-pkg")?.name, "first-pkg");
    assertEquals(regularReloadStub.calls.length, 0);

    // 2. Subsequent package installed into existing registry -> existing repo reloaded in place
    await Deno.writeTextFile(path.join(registryDir, "second-pkg.levain.yaml"), "version: 2.0.0\n");
    await rm.reloadInstalled();
    assertEquals(rm.repositoryInstalled.resolvePackage("second-pkg")?.name, "second-pkg");
    assertEquals(regularReloadStub.calls.length, 0);
  } finally {
    regularReloadStub.restore();
  }
});

Deno.test("RepositoryManager.init with installedOnly skips regular repositories", async () => {
  const config = TestHelper.getConfig();
  const repositoryManager = new RepositoryManager(config);
  const extraRepoDir = TestHelper.getTestDataPath("repository_manager/extraRepo");

  await repositoryManager.init({ extraRepos: [extraRepoDir], installedOnly: true });

  assertEquals(repositoryManager.repository.listPackages(), []);
  assertEquals(repositoryManager.repositoryInstalled.initialized(), true);
});

Deno.test("RepositoryManager handles uninitialized getters, reloadCurrentDir, and currentDirPackage (0, 1, multiple)", async () => {
  const config = TestHelper.getConfig();
  const rm = new RepositoryManager(config);

  assertThrows(() => rm.repository, Error);
  assertThrows(() => rm.repositoryInstalled, Error);
  assertEquals(await rm.currentDirPackage(), undefined);

  // reloadCurrentDir initializes currentDir repo
  await rm.reloadCurrentDir();
  assert(rm.repositories.currentDir?.initialized());

  // Single package in uninitialized currentDir repo -> auto-inits and returns it
  const singleDir = TestHelper.getNewTempDir();
  await Deno.writeTextFile(path.join(singleDir, "solo.levain.yaml"), "version: 1.0.0\n");
  rm.repositories.currentDir = new FileSystemRepository(config, singleDir, true);
  assertEquals((await rm.currentDirPackage())?.name, "solo");

  // Multiple packages in currentDir -> warns and returns first package
  const multiDir = TestHelper.getNewTempDir();
  await Deno.writeTextFile(path.join(multiDir, "alpha.levain.yaml"), "version: 1.0.0\n");
  await Deno.writeTextFile(path.join(multiDir, "beta.levain.yaml"), "version: 1.0.0\n");
  rm.repositories.currentDir = new FileSystemRepository(config, multiDir, true);
  const chosen = await rm.currentDirPackage();
  assert(chosen?.name === "alpha" || chosen?.name === "beta");

  // Empty currentDir -> undefined
  const emptyDir = TestHelper.getNewTempDir();
  rm.repositories.currentDir = new FileSystemRepository(config, emptyDir, true);
  assertEquals(await rm.currentDirPackage(), undefined);

  // init() initializes any uninitialized repo returned by createRepositories
  const customRepo = new FileSystemRepository(config, singleDir, true);
  const createStub = stub(rm, "createCurrentDirRepo", () => {
    rm.repositories.currentDir = customRepo;
    return Promise.resolve(customRepo);
  });
  try {
    const inited = await rm.init({ extraRepos: [], installedOnly: true });
    assert(inited.includes(customRepo));
    assertEquals(customRepo.initialized(), true);
  } finally {
    createStub.restore();
  }

  // Null repositories guard throws on reload
  (rm as unknown as { repositories: unknown }).repositories = undefined;
  await assertRejects(() => rm.reload(), Error);
});
