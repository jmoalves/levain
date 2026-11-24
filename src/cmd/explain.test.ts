import * as path from "@std/path";
import { assert, assertRejects } from "@std/assert";

import t from "../lib/i18n.ts";
import TestHelper from "../lib/test/test_helper.ts";
import { assertFind } from "../lib/test/more_asserts.ts";

import CommandFactory from "./command_factory.ts";
import ExplainCommand from "./explain.ts";

async function setupConfigWithRecipes(recipes: Record<string, string>) {
  const repoDir = TestHelper.getNewTempDir();
  for (const [filename, content] of Object.entries(recipes)) {
    await Deno.writeTextFile(path.join(repoDir, filename), content);
  }
  const config = TestHelper.getConfig();
  await config.repositoryManager.init({ extraRepos: [], tempRepos: [repoDir] });
  return config;
}

Deno.test("ExplainCommand should be registered in CommandFactory", () => {
  const factory = new CommandFactory();
  const cmd = factory.get("explain", TestHelper.getConfig());
  assert(cmd instanceof ExplainCommand);
});

Deno.test("ExplainCommand should throw when no packages are provided", async () => {
  const config = await setupConfigWithRecipes({});
  const cmd = new ExplainCommand(config);

  await assertRejects(
    async () => await cmd.execute([]),
    Error,
    t("cmd.explain.nothing"),
  );
});

Deno.test("ExplainCommand should log similar packages and throw when package cannot be resolved", async () => {
  const logger = await TestHelper.setupTestLogger();
  const config = await setupConfigWithRecipes({
    "my-tool.levain.yaml": "version: 1.0.0\n",
  });
  const cmd = new ExplainCommand(config);

  await assertRejects(
    async () => await cmd.execute(["my-tol"]),
    Error,
    t("cmd.explain.nothing"),
  );
  assertFind(logger.messages, (msg) => msg.includes("my-tool"));
});

Deno.test("ExplainCommand should print install, shell, and env actions for package and dependencies", async () => {
  const logger = await TestHelper.setupTestLogger();
  const config = await setupConfigWithRecipes({
    "dep-pkg.levain.yaml": `version: 1.0.0\ncmd.install:\n  - echo installing dep\n`,
    "app-pkg.levain.yaml": [
      "version: 2.0.0",
      "dependencies:",
      "  - dep-pkg",
      "cmd.install:",
      "  - mkdir ${baseDir}/bin",
      "cmd.shell:",
      "  - echo entering app shell",
      "cmd.env:",
      "  - setEnv APP_HOME ${baseDir}",
    ].join("\n"),
  });

  const cmd = new ExplainCommand(config);
  await cmd.execute(["app-pkg"]);

  assertFind(logger.messages, (msg) => msg.includes("# levain explain app-pkg"));
  assertFind(logger.messages, (msg) => msg.includes("## levain install dep-pkg"));
  assertFind(logger.messages, (msg) => msg.includes("* echo installing dep"));
  assertFind(logger.messages, (msg) => msg.includes("## levain install app-pkg"));
  assertFind(logger.messages, (msg) => msg.includes("* mkdir ${baseDir}/bin"));
  assertFind(logger.messages, (msg) => msg.includes("* echo entering app shell"));
  assertFind(logger.messages, (msg) => msg.includes("* setEnv APP_HOME ${baseDir}"));
});
