import * as path from "@std/path";
import { assert, assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";

import LevainVersion from "../levain_version.ts";
import t from "../lib/i18n.ts";
import RepositoryFactory from "../lib/repository/repository_factory.ts";
import TestHelper from "../lib/test/test_helper.ts";
import { assertFind } from "../lib/test/more_asserts.ts";

import CommandFactory from "./command_factory.ts";
import InfoCommand, { type InfoJsonOutput } from "./info.ts";

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
  if (Object.keys(installedRecipes).length > 0) {
    await Deno.mkdir(registryDir, { recursive: true });
    for (const [filename, content] of Object.entries(installedRecipes)) {
      await Deno.writeTextFile(path.join(registryDir, filename), content);
    }
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

Deno.test("InfoCommand should show valid sibling packages and Levain even when another package is missing", async () => {
  const logger = await TestHelper.setupTestLogger();
  const { config } = await setupConfigWithRecipes({
    "my-sample.levain.yaml": "version: 1.0.0\n",
  });

  const cmd = new InfoCommand(config);
  await cmd.execute(["my-sample", "my-sampl"]);

  assertFind(
    logger.messages,
    (msg) => msg.includes(`+ my-sample - 1.0.0${t("cmd.info.notInstalled")}`),
  );
  assertFind(
    logger.messages,
    (msg) => msg.includes(t("cmd.info.packageNotFound", { pkgName: "my-sampl" })),
  );
  assertFind(logger.messages, (msg) => msg.includes("my-sample"));
  assertFind(logger.messages, (msg) => msg.includes("+ levain - "));
});

Deno.test("InfoCommand --json outputs structured JSON for existing, installed, outdated, registry-only, and missing packages", async () => {
  await TestHelper.setupTestLogger();
  const { config } = await setupConfigWithRecipes(
    {
      "dep-lib.levain.yaml": "version: 1.2.3\n",
      "my-app.levain.yaml": "version: 2.0.0\ndependencies:\n  - dep-lib\n",
      "up-to-date.levain.yaml": "version: 1.0.0\n",
      "needs-update.levain.yaml": "version: 2.0.0\n",
    },
    {
      "up-to-date.levain.yaml": "version: 1.0.0\n",
      "needs-update.levain.yaml": "version: 1.0.0\n",
      "orphan-installed.levain.yaml": "version: 0.9.0\n",
    },
  );

  const cmd = new InfoCommand(config);
  const stdoutLines: string[] = [];
  const logStub = stub(console, "log", (...args: unknown[]) => {
    stdoutLines.push(args.map(String).join(" "));
  });

  try {
    // No packages -> Levain metadata only
    await cmd.execute(["--json"]);
    assertEquals(stdoutLines.length, 1);
    const noPkgOutput = JSON.parse(stdoutLines[0]) as InfoJsonOutput;
    assertEquals(noPkgOutput.levain.version, LevainVersion.levainVersion.versionNumber);
    assertEquals(noPkgOutput.levain.denoVersion, Deno.version.deno);
    assertEquals(noPkgOutput.levain.levainHome, config.configPaths.levainHome);
    assertEquals(noPkgOutput.packages, []);
    assertEquals(noPkgOutput.installationOrder, null);

    // Resolvable package graph -> installationOrder populated in dependency order
    stdoutLines.length = 0;
    await cmd.execute(["--json", "my-app.levain.yaml", "up-to-date", "needs-update"]);
    const resolvedOutput = JSON.parse(stdoutLines[0]) as InfoJsonOutput;
    assertEquals(resolvedOutput.packages.length, 3);

    const [myApp, upToDate, needsUpdate] = resolvedOutput.packages;
    assertEquals(myApp.name, "my-app");
    assertEquals(myApp.exists, true);
    assertEquals(myApp.installed, false);
    assertEquals(myApp.version, "2.0.0");
    assertEquals(myApp.installedVersion, null);
    assertEquals(myApp.updateAvailable, false);
    assert(myApp.baseDir?.endsWith("my-app"));
    assert(myApp.dependencies.includes("dep-lib"));

    assertEquals(upToDate.name, "up-to-date");
    assertEquals(upToDate.exists, true);
    assertEquals(upToDate.installed, true);
    assertEquals(upToDate.version, "1.0.0");
    assertEquals(upToDate.installedVersion, "1.0.0");
    assertEquals(upToDate.updateAvailable, false);

    assertEquals(needsUpdate.name, "needs-update");
    assertEquals(needsUpdate.exists, true);
    assertEquals(needsUpdate.installed, true);
    assertEquals(needsUpdate.version, "2.0.0");
    assertEquals(needsUpdate.installedVersion, "1.0.0");
    assertEquals(needsUpdate.updateAvailable, true);

    assert(Array.isArray(resolvedOutput.installationOrder));
    assert(
      resolvedOutput.installationOrder.indexOf("dep-lib") < resolvedOutput.installationOrder.indexOf("my-app"),
    );

    // Mixed missing + registry-only + existing -> installationOrder is null, every queried entry reported
    stdoutLines.length = 0;
    await cmd.execute(["--json", "--verbose", "missing-pkg", "orphan-installed", "up-to-date"]);
    const mixedOutput = JSON.parse(stdoutLines[0]) as InfoJsonOutput;
    assertEquals(mixedOutput.installationOrder, null);
    assertEquals(mixedOutput.packages.length, 3);

    const [missing, orphan, existing] = mixedOutput.packages;
    assertEquals(missing, {
      name: "missing-pkg",
      exists: false,
      installed: false,
      version: null,
      installedVersion: null,
      updateAvailable: false,
      baseDir: null,
      pkgDir: null,
      repo: null,
      filePath: null,
      dependencies: [],
    });

    assertEquals(orphan.name, "orphan-installed");
    assertEquals(orphan.exists, false);
    assertEquals(orphan.installed, true);
    assertEquals(orphan.version, null);
    assertEquals(orphan.installedVersion, "0.9.0");
    assertEquals(orphan.updateAvailable, false);
    assert(orphan.baseDir?.endsWith("orphan-installed"));

    assertEquals(existing.name, "up-to-date");
    assertEquals(existing.exists, true);
    assertEquals(existing.installed, true);
  } finally {
    logStub.restore();
  }
});
