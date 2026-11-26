import * as path from "@std/path";
import { existsSync } from "@std/fs";
import { assert, assertEquals, assertRejects } from "@std/assert";

import LevainVersion from "../levain_version.ts";
import Config from "../lib/config.ts";
import t from "../lib/i18n.ts";
import LevainPaths from "../lib/paths/levain_paths.ts";
import RepositoryFactory from "../lib/repository/repository_factory.ts";
import TestHelper from "../lib/test/test_helper.ts";
import { assertFind } from "../lib/test/more_asserts.ts";

import CommandFactory from "./command_factory.ts";
import Install from "./install.ts";
import Update from "./update.ts";

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

async function setupConfigWithRecipes(
  recipes: Record<string, string>,
  { seedLevain = true }: { seedLevain?: boolean } = {},
) {
  RepositoryFactory.knownRepos.clear();
  const repoDir = TestHelper.getNewTempDir();
  for (const [filename, content] of Object.entries(recipes)) {
    await Deno.writeTextFile(path.join(repoDir, filename), content);
  }
  const config = TestHelper.getConfig();
  if (seedLevain) {
    await seedInstalledLevain(config);
  }
  await config.repositoryManager.init({ extraRepos: [], tempRepos: [repoDir] });
  return { config, repoDir, levainHome: config.configPaths.levainHome };
}

Deno.test("Update should be registered in CommandFactory", () => {
  const factory = new CommandFactory();
  const cmd = factory.get("update", TestHelper.getConfig());
  assert(cmd instanceof Update);
});

Deno.test("Update.bkpTag should format timestamp with bkp- prefix", () => {
  const cmd = new Update(TestHelper.getConfig());
  const dt = new Date(2026, 4, 7, 9, 5, 3);
  assertEquals(cmd.bkpTag(dt), "bkp-20260507-090503");
});

Deno.test("Update with no args should throw when no packages are installed", async () => {
  const { config } = await setupConfigWithRecipes({}, { seedLevain: false });
  const cmd = new Update(config);

  await assertRejects(
    async () => await cmd.execute([]),
    Error,
    t("cmd.install.noPackages"),
  );
});

Deno.test("Update should throw errorNotFound and suggest similar packages when given an unknown package", async () => {
  const logger = await TestHelper.setupTestLogger();
  const { config } = await setupConfigWithRecipes({
    "my-updater.levain.yaml": "version: 1.0.0\n",
  });
  const cmd = new Update(config);

  await assertRejects(
    async () => await cmd.execute(["my-updatr"]),
    Error,
    t("cmd.install.errorNotFound", { pkgNames: ["my-updatr"] }),
  );
  assertFind(logger.messages, (msg) => msg.includes("my-updater"));
});

Deno.test("Update with no args should discover installed packages and upgrade outdated ones", async () => {
  const { config, repoDir, levainHome } = await setupConfigWithRecipes({
    "updatable-tool.levain.yaml": [
      "version: 1.0.0",
      "cmd.install:",
      "  - mkdir ${baseDir}/v1",
    ].join("\n"),
  });

  await new Install(config).execute(["updatable-tool"]);

  // Bump version in repository
  await Deno.writeTextFile(
    path.join(repoDir, "updatable-tool.levain.yaml"),
    [
      "version: 2.0.0",
      "cmd.install:",
      "  - mkdir ${baseDir}/v2",
    ].join("\n"),
  );

  const config2 = await createConfigForHome(levainHome, repoDir);
  await new Update(config2).execute([]);

  assert(existsSync(path.join(levainHome, "updatable-tool", "v2")));
  assertEquals(existsSync(path.join(levainHome, "updatable-tool", "v1")), false);
  const backups = [...Deno.readDirSync(config2.configPaths.levainBackupDir)];
  assert(backups.length >= 1, "update should create a backup of the previous install");
});

Deno.test("Update should skip up-to-date package unless --force is passed", async () => {
  const { config, repoDir, levainHome } = await setupConfigWithRecipes({
    "steady-tool.levain.yaml": [
      "version: 1.0.0",
      "cmd.install:",
      "  - mkdir ${baseDir}/bin",
    ].join("\n"),
  });

  await new Install(config).execute(["steady-tool"]);

  const markerFile = path.join(levainHome, "steady-tool", "marker.txt");
  await Deno.writeTextFile(markerFile, "stay");

  const config2 = await createConfigForHome(levainHome, repoDir);
  await new Update(config2).execute(["steady-tool"]);
  assert(existsSync(markerFile), "up-to-date package should not be replaced without --force");

  const config3 = await createConfigForHome(levainHome, repoDir);
  await new Update(config3).execute(["--force", "steady-tool"]);
  assertEquals(existsSync(markerFile), false);
  assert(existsSync(path.join(levainHome, "steady-tool", "bin")));
});

Deno.test("Update should preserve baseDir files when levain.preserveBaseDirOnUpdate is true", async () => {
  const { config, repoDir, levainHome } = await setupConfigWithRecipes({
    "sticky-tool.levain.yaml": [
      "version: 1.0.0",
      "levain.preserveBaseDirOnUpdate: true",
      "cmd.install:",
      "  - mkdir ${baseDir}/sub",
    ].join("\n"),
  });

  await new Install(config).execute(["sticky-tool"]);

  const customFile = path.join(levainHome, "sticky-tool", "settings.ini");
  await Deno.writeTextFile(customFile, "keep=1");

  const config2 = await createConfigForHome(levainHome, repoDir);
  await new Update(config2).execute(["--force", "sticky-tool"]);
  assert(existsSync(customFile), "preserveBaseDirOnUpdate should keep existing files");
});

Deno.test("Update should fail with error when levain.minVersion is newer than current Levain", async () => {
  const logger = await TestHelper.setupTestLogger();
  const { config, repoDir, levainHome } = await setupConfigWithRecipes({
    "future-update.levain.yaml": [
      "version: 1.0.0",
      "cmd.install:",
      "  - mkdir ${baseDir}/v1",
    ].join("\n"),
  });

  await new Install(config).execute(["future-update"]);

  await Deno.writeTextFile(
    path.join(repoDir, "future-update.levain.yaml"),
    [
      "version: 2.0.0",
      "levain:",
      "  minVersion: 99.0.0",
      "cmd.install:",
      "  - mkdir ${baseDir}/blocked",
    ].join("\n"),
  );

  const config2 = await createConfigForHome(levainHome, repoDir);
  const cmd = new Update(config2);
  await assertRejects(
    async () => await cmd.execute(["future-update"]),
    Error,
    t("cmd.install.mustUpgradeLevain", { pkg: "future-update" }),
  );

  assertFind(
    logger.messages,
    (msg) =>
      msg.includes(
        t("cmd.install.ignoreMinVer", {
          pkg: "future-update",
          min: "99.0.0",
          current: LevainVersion.levainVersion,
        }),
      ),
  );
  assertEquals(existsSync(path.join(levainHome, "future-update", "blocked")), false);
  assert(existsSync(path.join(levainHome, "future-update", "v1")));
});

Deno.test("Update with no args skips unneeded cmd.env for implicit cross-package env vars while still providing dependency cmd.env (Issue #200)", async () => {
  // Regression for Issue #200:
  // `addon-features` sorts before `runtime-v1` and references `${RUNTIME_HOME}` in cmd.env
  // without declaring `runtime-v1` in dependencies (because any `runtime-*` variant may be installed).
  // Meanwhile, `build-tool` explicitly depends on `base-sdk` and needs `${BASE_SDK_HOME}` during cmd.install.
  const { config, repoDir, levainHome } = await setupConfigWithRecipes({
    "addon-features.levain.yaml": [
      "version: 1.0.0",
      "cmd.install:",
      "  - mkdir ${baseDir}/v1",
      "cmd.env:",
      "  - setEnv ADDON_RUNTIME ${RUNTIME_HOME}/features",
    ].join("\n"),
    "runtime-v1.levain.yaml": [
      "version: 1.0.0",
      "cmd.install:",
      "  - mkdir ${baseDir}/bin",
      "cmd.env:",
      "  - setEnv RUNTIME_HOME ${baseDir}",
    ].join("\n"),
    "base-sdk.levain.yaml": [
      "version: 1.0.0",
      "cmd.install:",
      "  - mkdir ${baseDir}/lib",
      "cmd.env:",
      "  - setEnv BASE_SDK_HOME ${baseDir}",
    ].join("\n"),
    "build-tool.levain.yaml": [
      "version: 1.0.0",
      "dependencies:",
      "  - base-sdk",
      "cmd.install:",
      "  - mkdir ${baseDir}/v1",
    ].join("\n"),
  });

  // Initial install in valid order (runtime-v1 before addon-features, base-sdk before build-tool)
  await new Install(config).execute(["runtime-v1", "addon-features", "build-tool"]);

  // Bump BOTH addon-features and build-tool (which reads ${BASE_SDK_HOME} from up-to-date base-sdk's cmd.env)
  await Deno.writeTextFile(
    path.join(repoDir, "addon-features.levain.yaml"),
    [
      "version: 2.0.0",
      "cmd.install:",
      "  - mkdir ${baseDir}/v2",
      "cmd.env:",
      "  - setEnv ADDON_RUNTIME ${RUNTIME_HOME}/features",
    ].join("\n"),
  );
  await Deno.writeTextFile(
    path.join(repoDir, "build-tool.levain.yaml"),
    [
      "version: 2.0.0",
      "dependencies:",
      "  - base-sdk",
      "cmd.install:",
      "  - mkdir ${baseDir}/v2",
      "  - setVar USED_SDK ${BASE_SDK_HOME}",
    ].join("\n"),
  );

  // Bare `levain update` must succeed without aborting on undefined ${RUNTIME_HOME},
  // update both addon-features and build-tool, AND run base-sdk's cmd.env for build-tool!
  const config2 = await createConfigForHome(levainHome, repoDir);
  await new Update(config2).execute([]);

  assert(existsSync(path.join(levainHome, "addon-features", "v2")), "addon-features should update to v2");
  assert(existsSync(path.join(levainHome, "build-tool", "v2")), "build-tool should update to v2");
  assertEquals(config2.getVar("USED_SDK"), path.join(levainHome, "base-sdk"));
});

Deno.test("Update with no args isolates single-package failures, skips dependent packages, warns on missing upstream recipes, and updates unaffected packages", async () => {
  const logger = await TestHelper.setupTestLogger();
  const { config, repoDir, levainHome } = await setupConfigWithRecipes({
    "aaa-broken.levain.yaml": [
      "version: 1.0.0",
      "cmd.install:",
      "  - mkdir ${baseDir}/v1",
    ].join("\n"),
    "bbb-depends-broken.levain.yaml": [
      "version: 1.0.0",
      "dependencies:",
      "  - aaa-broken",
      "cmd.install:",
      "  - mkdir ${baseDir}/v1",
    ].join("\n"),
    "ccc-removed-upstream.levain.yaml": [
      "version: 1.0.0",
      "cmd.install:",
      "  - mkdir ${baseDir}/v1",
    ].join("\n"),
    "zzz-healthy.levain.yaml": [
      "version: 1.0.0",
      "cmd.install:",
      "  - mkdir ${baseDir}/v1",
    ].join("\n"),
  });

  await new Install(config).execute(["bbb-depends-broken", "ccc-removed-upstream", "zzz-healthy"]);

  // Break aaa-broken's v2, remove ccc-removed-upstream from repo, and bump zzz-healthy & bbb-depends-broken to v2
  await Deno.writeTextFile(
    path.join(repoDir, "aaa-broken.levain.yaml"),
    [
      "version: 2.0.0",
      "cmd.install:",
      "  - echo ${UNDEFINED_BROKEN_VAR}",
    ].join("\n"),
  );
  await Deno.writeTextFile(
    path.join(repoDir, "bbb-depends-broken.levain.yaml"),
    [
      "version: 2.0.0",
      "dependencies:",
      "  - aaa-broken",
      "cmd.install:",
      "  - mkdir ${baseDir}/v2",
    ].join("\n"),
  );
  await Deno.remove(path.join(repoDir, "ccc-removed-upstream.levain.yaml"));
  await Deno.writeTextFile(
    path.join(repoDir, "zzz-healthy.levain.yaml"),
    [
      "version: 2.0.0",
      "cmd.install:",
      "  - mkdir ${baseDir}/v2",
    ].join("\n"),
  );

  const config2 = await createConfigForHome(levainHome, repoDir);
  await assertRejects(
    () => new Update(config2).execute([]),
    Error,
    "aaa-broken",
  );

  // Healthy independent package WAS updated despite aaa-broken failing and ccc-removed-upstream missing!
  assert(existsSync(path.join(levainHome, "zzz-healthy", "v2")), "unaffected zzz-healthy should still update to v2");
  // Dependent of broken package was skipped (not updated to v2)
  assertEquals(existsSync(path.join(levainHome, "bbb-depends-broken", "v2")), false);
  // Warning emitted for missing upstream recipe and skipped dependent
  assertFind(logger.messages, (m) => m.includes("ccc-removed-upstream"));
  assertFind(logger.messages, (m) => m.includes("bbb-depends-broken"));

  // When ALL installed recipes are missing upstream, update warns and returns cleanly without throwing noPackages
  const onlyMissing = await setupConfigWithRecipes({}, { seedLevain: false });
  await Deno.mkdir(onlyMissing.config.configPaths.levainRegistryDir, { recursive: true });
  await Deno.writeTextFile(
    path.join(onlyMissing.config.configPaths.levainRegistryDir, "orphan.levain.yaml"),
    "version: 1.0.0\n",
  );
  const onlyMissingCfg2 = await createConfigForHome(onlyMissing.levainHome, onlyMissing.repoDir);
  await new Update(onlyMissingCfg2).execute([]);
});
