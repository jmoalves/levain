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
