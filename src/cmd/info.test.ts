import * as path from "@std/path";
import { assert, assertEquals } from "@std/assert";

import t from "../lib/i18n.ts";
import RepositoryFactory from "../lib/repository/repository_factory.ts";
import TestHelper from "../lib/test/test_helper.ts";
import { assertFind } from "../lib/test/more_asserts.ts";

import CommandFactory from "./command_factory.ts";
import InfoCommand from "./info.ts";

async function setupConfigWithRecipes(
  recipes: Record<string, string>,
  installedRecipes: Record<string, string> = {},
) {
  RepositoryFactory.knownRepos.clear();
  const repoDir = TestHelper.getNewTempDir();
  for (const [filename, content] of Object.entries(recipes)) {
    await Deno.writeTextFile(path.join(repoDir, filename), content);
  }
  const config = TestHelper.getConfig();
  const registryDir = config.configPaths.levainRegistryDir;
  for (const [filename, content] of Object.entries(installedRecipes)) {
    await Deno.writeTextFile(path.join(registryDir, filename), content);
  }
  await config.repositoryManager.init({ extraRepos: [], tempRepos: [repoDir] });
  return { config, repoDir };
}

Deno.test("InfoCommand should be registered in CommandFactory", () => {
  const factory = new CommandFactory();
  const cmd = factory.get("info", TestHelper.getConfig());
  assert(cmd instanceof InfoCommand);
});

Deno.test("InfoCommand with no args should display Levain info", async () => {
  const logger = await TestHelper.setupTestLogger();
  const { config } = await setupConfigWithRecipes({});

  const cmd = new InfoCommand(config);
  await cmd.execute([]);

  assertFind(logger.messages, (msg) => msg.includes("=== Levain"));
  assertFind(logger.messages, (msg) => msg.includes("+ levain - "));
});

Deno.test("InfoCommand should show package dependencies, verbose details, and installation order", async () => {
  const logger = await TestHelper.setupTestLogger();
  const { config } = await setupConfigWithRecipes({
    "dep-lib.levain.yaml": `version: 1.2.3\n`,
    "my-app.levain.yaml": `version: 2.0.0\ndependencies:\n  - dep-lib\n`,
  });

  const cmd = new InfoCommand(config);
  await cmd.execute(["--verbose", "my-app"]);

  assertFind(logger.messages, (msg) => msg.includes(t("cmd.info.yourPackages")));
  assertFind(
    logger.messages,
    (msg) => msg.includes(`+ my-app - 2.0.0${t("cmd.info.notInstalled")}`),
  );
  assertFind(
    logger.messages,
    (msg) => msg.includes(`  + dep-lib - 1.2.3${t("cmd.info.notInstalled")}`),
  );
  assertFind(logger.messages, (msg) => msg.includes("| baseDir...:"));
  assertFind(logger.messages, (msg) => msg.includes("| pkgDir....:"));
  assertFind(logger.messages, (msg) => msg.includes("| repo......:"));
  assertFind(logger.messages, (msg) => msg.includes("\\ filePath..:"));
  assertFind(logger.messages, (msg) => msg.includes(t("cmd.info.installationOrder")));

  const orderIdx = logger.messages.findIndex((msg) => msg.includes(t("cmd.info.installationOrder")));
  const orderedPkgs = logger.messages.slice(orderIdx + 1).map((msg) => msg.replace(/^INFO /, ""));
  assert(orderedPkgs.indexOf("dep-lib") < orderedPkgs.indexOf("my-app"));
});

Deno.test("InfoCommand should distinguish installed and updateAvailable packages", async () => {
  const logger = await TestHelper.setupTestLogger();
  const { config } = await setupConfigWithRecipes(
    {
      "up-to-date.levain.yaml": `version: 1.0.0\n`,
      "needs-update.levain.yaml": `version: 2.0.0\n`,
    },
    {
      "up-to-date.levain.yaml": `version: 1.0.0\n`,
      "needs-update.levain.yaml": `version: 1.0.0\n`,
    },
  );

  const cmd = new InfoCommand(config);
  await cmd.execute(["up-to-date", "needs-update"]);

  const upToDateLine = logger.messages.find((msg) => msg.includes("+ up-to-date - 1.0.0"));
  assert(upToDateLine, "should print up-to-date package");
  assertEquals(upToDateLine.includes(t("cmd.info.notInstalled")), false);
  assertEquals(upToDateLine.includes(t("cmd.info.needUpdate")), false);

  assertFind(
    logger.messages,
    (msg) => msg.includes(`+ needs-update - 2.0.0${t("cmd.info.needUpdate")}`),
  );
});

Deno.test("InfoCommand should log packageNotFound when requested package is missing", async () => {
  const logger = await TestHelper.setupTestLogger();
  const { config } = await setupConfigWithRecipes({});

  const cmd = new InfoCommand(config);
  await cmd.execute(["missing-package-xyz"]);

  assertFind(
    logger.messages,
    (msg) => msg.includes(t("cmd.info.packageNotFound", { pkgName: "missing-package-xyz" })),
  );
});
