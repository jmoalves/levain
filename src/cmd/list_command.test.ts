import { assert, assertEquals } from "@std/assert";

import t from "../lib/i18n.ts";
import { MockPackage } from "../lib/package/mock_package.ts";
import MockRepository from "../lib/repository/mock_repository.ts";
import TestHelper from "../lib/test/test_helper.ts";
import { assertFind } from "../lib/test/more_asserts.ts";
import VersionNumber from "../lib/utils/version_number.ts";

import CommandFactory from "./command_factory.ts";
import ListCommand from "./list_command.ts";

Deno.test("ListCommand should be registered in CommandFactory", () => {
  const factory = new CommandFactory();
  const cmd = factory.get("list", TestHelper.getConfig());
  assert(cmd instanceof ListCommand);
});

Deno.test("ListCommand should report when repository has no packages", async () => {
  const logger = await TestHelper.setupTestLogger();
  const config = TestHelper.getConfig();
  config.repositoryManager.repository = new MockRepository("EmptyMock", []);

  const cmd = new ListCommand(config);
  cmd.execute([]);

  assertFind(logger.messages, (msg) => msg.includes(t("cmd.list_command.noPackages")));
});

Deno.test("ListCommand should list all packages when no filter is given", async () => {
  const logger = await TestHelper.setupTestLogger();
  const config = TestHelper.getConfig();
  config.repositoryManager.repository = new MockRepository("TestMock", [
    new MockPackage("alpha", new VersionNumber("1.0.0")),
    new MockPackage("beta", new VersionNumber("2.0.0")),
  ]);

  const cmd = new ListCommand(config);
  cmd.execute();

  assertFind(logger.messages, (msg) => msg.includes(t("cmd.list_command.packagesFound", { pkg: 2, count: 2 })));
  assertFind(logger.messages, (msg) => msg.includes("alpha"));
  assertFind(logger.messages, (msg) => msg.includes("beta"));
});

Deno.test("ListCommand should filter packages by search text", async () => {
  const logger = await TestHelper.setupTestLogger();
  const config = TestHelper.getConfig();
  config.repositoryManager.repository = new MockRepository("TestMock", [
    new MockPackage("jdk-21", new VersionNumber("21.0.0")),
    new MockPackage("maven", new VersionNumber("3.9.0")),
  ]);

  const cmd = new ListCommand(config);
  cmd.execute(["jdk"]);

  assertFind(logger.messages, (msg) => msg.includes(t("cmd.list_command.packagesFound", { pkg: 1, count: 2 })));
  assertFind(logger.messages, (msg) => msg.includes("jdk-21"));
  assertEquals(logger.messages.some((msg) => msg.includes("maven")), false);
});

Deno.test("ListCommand should suggest similar packages when filter matches nothing", async () => {
  const logger = await TestHelper.setupTestLogger();
  const config = TestHelper.getConfig();
  config.repositoryManager.repository = new MockRepository("TestMock", [
    new MockPackage("anotherPackage", new VersionNumber("1.0.0")),
    new MockPackage("git", new VersionNumber("2.45.0")),
  ]);

  const cmd = new ListCommand(config);
  cmd.execute(["anoterPackage"]);

  assertFind(logger.messages, (msg) => msg.includes(t("cmd.list_command.unableToList")));
  assertFind(logger.messages, (msg) => msg.includes(t("cmd.list_command.similarPackages")));
  assertFind(logger.messages, (msg) => msg.includes("anotherPackage"));
});

Deno.test("ListCommand should report no similar packages when search is unrelated", async () => {
  const logger = await TestHelper.setupTestLogger();
  const config = TestHelper.getConfig();
  config.repositoryManager.repository = new MockRepository("TestMock", [
    new MockPackage("git", new VersionNumber("2.45.0")),
  ]);

  const cmd = new ListCommand(config);
  cmd.execute(["zzzzzzzzzz"]);

  assertFind(logger.messages, (msg) => msg.includes(t("cmd.list_command.unableToList")));
  assertFind(logger.messages, (msg) => msg.includes(t("cmd.list_command.unableToSimilar")));
});

Deno.test("ListCommand.similarNames should match substrings and Levenshtein distance <= 2", () => {
  const cmd = new ListCommand(TestHelper.getConfig());

  assertEquals(cmd.similarNames("jdk-21", "JDK"), true);
  assertEquals(cmd.similarNames("git", "git-bash"), true);
  assertEquals(cmd.similarNames("maven", "mavin"), true);
  assertEquals(cmd.similarNames("maven", "maevn"), true);
  assertEquals(cmd.similarNames("maven", "zzzzz"), false);
});
