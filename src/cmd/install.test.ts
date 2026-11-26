import * as path from "@std/path";
import { existsSync } from "@std/fs";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";

import LevainVersion from "../levain_version.ts";
import Config from "../lib/config.ts";
import t from "../lib/i18n.ts";
import FileSystemPackage from "../lib/package/file_system_package.ts";
import LevainPaths from "../lib/paths/levain_paths.ts";
import RepositoryFactory from "../lib/repository/repository_factory.ts";
import TestHelper from "../lib/test/test_helper.ts";
import { assertFind } from "../lib/test/more_asserts.ts";

import CommandFactory from "./command_factory.ts";
import Install from "./install.ts";

async function seedInstalledLevain(config: Config) {
  await Deno.mkdir(config.configPaths.levainBaseDir, { recursive: true });
  await Deno.mkdir(config.configPaths.levainRegistryDir, { recursive: true });
  await Deno.copyFile(
    LevainPaths.levainRecipePath,
    path.join(config.configPaths.levainRegistryDir, "levain.levain.yaml"),
  );
}

async function createConfigForHome(levainHome: string, repoDir: string) {
  RepositoryFactory.knownRepos.clear();
  const config = new Config({
    levainHome: [levainHome],
    levainCache: path.join(levainHome, ".levainCache"),
  });
  await config.repositoryManager.init({ extraRepos: [], tempRepos: [repoDir] });
  return config;
}

async function setupConfigWithRecipes(recipes: Record<string, string>) {
  RepositoryFactory.knownRepos.clear();
  const repoDir = TestHelper.getNewTempDir();
  for (const [filename, content] of Object.entries(recipes)) {
    await Deno.writeTextFile(path.join(repoDir, filename), content);
  }
  const config = TestHelper.getConfig();
  await seedInstalledLevain(config);
  await config.repositoryManager.init({ extraRepos: [], tempRepos: [repoDir] });
  return { config, repoDir, levainHome: config.configPaths.levainHome };
}

Deno.test("Install should be registered in CommandFactory", () => {
  const factory = new CommandFactory();
  const cmd = factory.get("install", TestHelper.getConfig());
  assert(cmd instanceof Install);
});

Deno.test("Install.bkpTag should format timestamp with bkp- prefix", () => {
  const cmd = new Install(TestHelper.getConfig());
  const dt = new Date(2026, 4, 7, 9, 5, 3);
  assertEquals(cmd.bkpTag(dt), "bkp-20260507-090503");
});

Deno.test("Install should throw when no packages and no currentDirPackage dependencies", async () => {
  const { config } = await setupConfigWithRecipes({});
  const curDirStub = stub(config.repositoryManager, "currentDirPackage", () => Promise.resolve(undefined));
  try {
    const cmd = new Install(config);
    await assertRejects(
      async () => await cmd.execute([]),
      Error,
      t("cmd.install.noPackages"),
    );
  } finally {
    curDirStub.restore();
  }
});

Deno.test("Install should throw errorNotFound and log similar packages for unknown package", async () => {
  const logger = await TestHelper.setupTestLogger();
  const { config } = await setupConfigWithRecipes({
    "my-tool.levain.yaml": "version: 1.0.0\n",
  });

  const cmd = new Install(config);
  await assertRejects(
    async () => await cmd.execute(["my-tol"]),
    Error,
    t("cmd.install.errorNotFound", { pkgNames: ["my-tol"] }),
  );

  assertFind(logger.messages, (msg) => msg.includes(t("cmd.install.similar")));
  assertFind(logger.messages, (msg) => msg.includes("my-tool"));
});

Deno.test("Install should install recipe from repository, run cmd.install and cmd.env, and register package", async () => {
  const { config, levainHome } = await setupConfigWithRecipes({
    "sample-pkg.levain.yaml": [
      "version: 1.0.0",
      "cmd.install:",
      "  - mkdir ${baseDir}/sub",
      "cmd.env:",
      "  - setEnv SAMPLE_ENV ok",
    ].join("\n"),
  });

  const cmd = new Install(config);
  const firstChanged = await cmd.installPackages(["sample-pkg"]);
  assertEquals(firstChanged, true);

  const baseDir = path.join(levainHome, "sample-pkg");
  assert(existsSync(path.join(baseDir, "sub")), "cmd.install mkdir should create subdir");
  assertEquals(config.getVar("SAMPLE_ENV"), "ok");
  assert(
    existsSync(path.join(config.configPaths.levainRegistryDir, "sample-pkg.levain.yaml")),
    "recipe should be copied into levainRegistryDir",
  );

  // Subsequent install when package is already installed and up to date reports false
  await config.repositoryManager.reload();
  const secondChanged = await cmd.installPackages(["sample-pkg"]);
  assertEquals(secondChanged, false);
});

Deno.test("Install should respect levain.pkg.skipInstallDir and levain.pkg.skipRegistry", async () => {
  const { config, levainHome } = await setupConfigWithRecipes({
    "meta-pkg.levain.yaml": [
      "version: 1.0.0",
      "levain.pkg.skipInstallDir: true",
      "levain.pkg.skipRegistry: true",
      "cmd.env:",
      "  - setEnv META_RAN yes",
    ].join("\n"),
  });

  const cmd = new Install(config);
  await cmd.execute(["meta-pkg"]);

  assertEquals(existsSync(path.join(levainHome, "meta-pkg")), false);
  assertEquals(
    existsSync(path.join(config.configPaths.levainRegistryDir, "meta-pkg.levain.yaml")),
    false,
  );
  assertEquals(config.getVar("META_RAN"), "yes");
});

Deno.test("Install should resolve dependencies from currentDirPackage when no args provided", async () => {
  const { config } = await setupConfigWithRecipes({
    "dep-from-cwd.levain.yaml": [
      "version: 1.0.0",
      "cmd.env:",
      "  - setEnv FROM_CWD yes",
    ].join("\n"),
  });

  const curPkg = new FileSystemPackage(
    config,
    "local-project",
    TestHelper.getNewTempDir(),
    "local-project.levain.yaml",
    "version: 1.0.0\ndependencies:\n  - dep-from-cwd\n",
  );
  const curDirStub = stub(config.repositoryManager, "currentDirPackage", () => Promise.resolve(curPkg));

  try {
    const cmd = new Install(config);
    await cmd.execute([]);
    assertEquals(config.getVar("FROM_CWD"), "yes");
  } finally {
    curDirStub.restore();
  }
});

Deno.test("Install should skip already-installed package unless --force is passed", async () => {
  const { config, repoDir, levainHome } = await setupConfigWithRecipes({
    "reinstall-pkg.levain.yaml": [
      "version: 1.0.0",
      "cmd.install:",
      "  - mkdir ${baseDir}/fresh",
    ].join("\n"),
  });

  await new Install(config).execute(["reinstall-pkg"]);

  const markerFile = path.join(levainHome, "reinstall-pkg", "marker.txt");
  await Deno.writeTextFile(markerFile, "keep");

  // Without --force, existing install is kept
  const config2 = await createConfigForHome(levainHome, repoDir);
  await new Install(config2).execute(["reinstall-pkg"]);
  assert(existsSync(markerFile), "non-forced install should not touch existing installation");

  // With --force, previous install is backed up and replaced
  const config3 = await createConfigForHome(levainHome, repoDir);
  await new Install(config3).execute(["--force", "reinstall-pkg"]);
  assertEquals(existsSync(markerFile), false);
  assert(existsSync(path.join(levainHome, "reinstall-pkg", "fresh")));
  const backups = [...Deno.readDirSync(config3.configPaths.levainBackupDir)];
  assert(backups.length >= 1, "forced reinstall should create a backup entry");
});

Deno.test("Install should prompt on updateAvailable and handle both decline and accept", async () => {
  const { config, repoDir, levainHome } = await setupConfigWithRecipes({
    "upgradable.levain.yaml": [
      "version: 1.0.0",
      "cmd.install:",
      "  - mkdir ${baseDir}/v1",
    ].join("\n"),
  });

  await new Install(config).execute(["upgradable"]);

  // Bump recipe to 2.0.0 in repo
  await Deno.writeTextFile(
    path.join(repoDir, "upgradable.levain.yaml"),
    [
      "version: 2.0.0",
      "cmd.install:",
      "  - mkdir ${baseDir}/v2",
    ].join("\n"),
  );

  // Decline update -> stays on v1
  const configDecline = await createConfigForHome(levainHome, repoDir);
  await TestHelper.mockInputWrap("N", async () => {
    await new Install(configDecline).execute(["upgradable"]);
  });
  assert(existsSync(path.join(levainHome, "upgradable", "v1")));
  assertEquals(existsSync(path.join(levainHome, "upgradable", "v2")), false);

  // --noUpdate -> also stays on v1 without prompting
  const configNoUpdate = await createConfigForHome(levainHome, repoDir);
  await new Install(configNoUpdate).execute(["--noUpdate", "upgradable"]);
  assertEquals(existsSync(path.join(levainHome, "upgradable", "v2")), false);

  // Accept update -> moves to v2 and saves backup
  const configAccept = await createConfigForHome(levainHome, repoDir);
  await TestHelper.mockInputWrap(t("cmd.install.updatePromptDefault"), async () => {
    await new Install(configAccept).execute(["upgradable"]);
  });
  assert(existsSync(path.join(levainHome, "upgradable", "v2")));
  assertEquals(existsSync(path.join(levainHome, "upgradable", "v1")), false);
});

Deno.test("Install should keep existing baseDir files when levain.preserveBaseDirOnUpdate is true", async () => {
  const { config, repoDir, levainHome } = await setupConfigWithRecipes({
    "preserve-pkg.levain.yaml": [
      "version: 1.0.0",
      "levain.preserveBaseDirOnUpdate: true",
      "cmd.install:",
      "  - mkdir ${baseDir}/kept",
    ].join("\n"),
  });

  await new Install(config).execute(["preserve-pkg"]);

  const userDataFile = path.join(levainHome, "preserve-pkg", "user.dat");
  await Deno.writeTextFile(userDataFile, "important");

  const config2 = await createConfigForHome(levainHome, repoDir);
  await new Install(config2).execute(["--force", "preserve-pkg"]);
  assert(existsSync(userDataFile), "preserveBaseDirOnUpdate should keep existing files in baseDir");
});

Deno.test("Install should abort with error and skip cmd.env when uninstalled package requires newer levain.minVersion", async () => {
  const logger = await TestHelper.setupTestLogger();
  const { config, levainHome } = await setupConfigWithRecipes({
    "future-pkg.levain.yaml": [
      "version: 1.0.0",
      "levain:",
      "  minVersion: 99.0.0",
      "cmd.install:",
      "  - mkdir ${baseDir}/should-not-exist",
      "cmd.env:",
      "  - setEnv FUTURE_ENV ran",
    ].join("\n"),
  });

  const cmd = new Install(config);
  await assertRejects(
    async () => await cmd.execute(["future-pkg"]),
    Error,
    t("cmd.install.mustUpgradeLevain", { pkg: "future-pkg" }),
  );

  assertFind(
    logger.messages,
    (msg) =>
      msg.includes(
        t("cmd.install.ignoreMinVer", {
          pkg: "future-pkg",
          min: "99.0.0",
          current: LevainVersion.levainVersion,
        }),
      ),
  );
  assertEquals(existsSync(path.join(levainHome, "future-pkg", "should-not-exist")), false);
  assertEquals(
    existsSync(path.join(config.configPaths.levainRegistryDir, "future-pkg.levain.yaml")),
    false,
  );
  assertEquals(config.getVar("FUTURE_ENV"), undefined);
});

Deno.test("Install should keep installed package and warn when update requires newer levain.minVersion", async () => {
  const logger = await TestHelper.setupTestLogger();
  const { config, repoDir, levainHome } = await setupConfigWithRecipes({
    "existing-future.levain.yaml": [
      "version: 1.0.0",
      "cmd.install:",
      "  - mkdir ${baseDir}/v1",
      "cmd.env:",
      "  - setEnv EXISTING_FUTURE_ENV ok",
    ].join("\n"),
  });

  await new Install(config).execute(["existing-future"]);

  await Deno.writeTextFile(
    path.join(repoDir, "existing-future.levain.yaml"),
    [
      "version: 2.0.0",
      "levain:",
      "  minVersion: 99.0.0",
      "cmd.install:",
      "  - mkdir ${baseDir}/v2",
      "cmd.env:",
      "  - setEnv EXISTING_FUTURE_ENV ok-v2",
    ].join("\n"),
  );

  const config2 = await createConfigForHome(levainHome, repoDir);
  await TestHelper.mockInputWrap(t("cmd.install.updatePromptDefault"), async () => {
    await new Install(config2).execute(["existing-future"]);
  });

  assertFind(
    logger.messages,
    (msg) =>
      msg.includes(
        t("cmd.install.ignoreMinVer", {
          pkg: "existing-future",
          min: "99.0.0",
          current: LevainVersion.levainVersion,
        }),
      ),
  );
  assert(existsSync(path.join(levainHome, "existing-future", "v1")));
  assertEquals(existsSync(path.join(levainHome, "existing-future", "v2")), false);
  // cmd.env must run from the installed v1 recipe, not the incompatible v2 recipe
  assertEquals(config2.getVar("EXISTING_FUTURE_ENV"), "ok");

  // If the installed baseDir is missing from disk, minVersion must fail instead of succeeding silently
  await Deno.remove(path.join(levainHome, "existing-future"), { recursive: true });
  const config3 = await createConfigForHome(levainHome, repoDir);
  await TestHelper.mockInputWrap(t("cmd.install.updatePromptDefault"), async () => {
    await assertRejects(
      async () => await new Install(config3).execute(["existing-future"]),
      Error,
      t("cmd.install.mustUpgradeLevain", { pkg: "existing-future" }),
    );
  });
});

Deno.test("Install should not mutate cmd.install array in place and should support spaces in levainHome", async () => {
  const repoDir = TestHelper.getNewTempDir();
  await Deno.writeTextFile(
    path.join(repoDir, "space-pkg.levain.yaml"),
    [
      "version: 1.0.0",
      "cmd.install:",
      "  - mkdir ${baseDir}/sub",
    ].join("\n"),
  );

  const parent = TestHelper.getNewTempDir();
  const homeWithSpaces = path.join(parent, "levain home with spaces");
  const config = await createConfigForHome(homeWithSpaces, repoDir);
  await seedInstalledLevain(config);
  await config.repositoryManager.reload();

  await new Install(config).execute(["space-pkg"]);

  const pkg = config.packageManager.package("space-pkg");
  assert(pkg);
  assertEquals(pkg.yamlItem("cmd.install"), ["mkdir ${baseDir}/sub"]);
  assert(existsSync(path.join(homeWithSpaces, "space-pkg", "sub")));
  assert(existsSync(path.join(config.configPaths.levainRegistryDir, "space-pkg.levain.yaml")));
});

Deno.test("Install should throw when savePreviousInstall fails", async () => {
  const { config, repoDir, levainHome } = await setupConfigWithRecipes({
    "fail-bkp.levain.yaml": [
      "version: 1.0.0",
      "cmd.install:",
      "  - mkdir ${baseDir}/sub",
    ].join("\n"),
  });

  await new Install(config).execute(["fail-bkp"]);

  const config2 = await createConfigForHome(levainHome, repoDir);
  // Make levainBackupDir a regular file so backup mkdir/copy fails deterministically
  const blockingFile = path.join(TestHelper.getNewTempDir(), "not-a-dir");
  await Deno.writeTextFile(blockingFile, "block");
  config2.configPaths.levainBackupDir = blockingFile;

  await assertRejects(
    async () => await new Install(config2).execute(["--force", "fail-bkp"]),
    Error,
    t("cmd.install.errorSaving", { pkg: "fail-bkp" }),
  );
});

Deno.test("Install.savePreviousInstall falls back to copy+remove on EXDEV cross-device rename", async () => {
  const { config, repoDir, levainHome } = await setupConfigWithRecipes({
    "exdev-pkg.levain.yaml": [
      "version: 1.0.0",
      "cmd.install:",
      "  - mkdir ${baseDir}/v1",
    ].join("\n"),
  });

  await new Install(config).execute(["exdev-pkg"]);
  assert(existsSync(path.join(levainHome, "exdev-pkg", "v1")));

  await Deno.writeTextFile(
    path.join(repoDir, "exdev-pkg.levain.yaml"),
    [
      "version: 2.0.0",
      "cmd.install:",
      "  - mkdir ${baseDir}/v2",
    ].join("\n"),
  );

  const config2 = await createConfigForHome(levainHome, repoDir);
  const renameStub = stub(Deno, "renameSync", () => {
    throw new Error("EXDEV: cross-device link not permitted (os error 18)");
  });

  try {
    await new Install(config2).execute(["--force", "exdev-pkg"]);
  } finally {
    renameStub.restore();
  }

  assert(existsSync(path.join(levainHome, "exdev-pkg", "v2")));
  assertEquals(existsSync(path.join(levainHome, "exdev-pkg", "v1")), false);
  // Backup directory must contain the previous v1 install
  const backups = [...Deno.readDirSync(config2.configPaths.levainBackupDir)].map((e) => e.name);
  assert(backups.length >= 1);
  assert(existsSync(path.join(config2.configPaths.levainBackupDir, backups[0], "exdev-pkg", "v1")));
});
