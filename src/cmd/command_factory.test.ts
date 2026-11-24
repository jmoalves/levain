import { assert, assertEquals, assertThrows } from "@std/assert";

import t from "../lib/i18n.ts";
import TestHelper from "../lib/test/test_helper.ts";
import { assertFind } from "../lib/test/more_asserts.ts";

import CommandFactory, { CommandNotFoundError } from "./command_factory.ts";

Deno.test("CommandFactory.list should expose all registered commands", () => {
  const factory = new CommandFactory();
  const commands = factory.list().sort();

  assertEquals(commands, [
    "_activate-machine",
    "actions",
    "activate",
    "clean",
    "clone",
    "explain",
    "info",
    "install",
    "list",
    "shell",
    "update",
  ]);
});

Deno.test("CommandFactory.get should instantiate every listed command with an example", () => {
  const factory = new CommandFactory();
  const config = TestHelper.getConfig();

  for (const name of factory.list()) {
    const cmd = factory.get(name, config);
    assert(typeof cmd.execute === "function", `command ${name} should have execute()`);
    assert(
      typeof cmd.oneLineExample === "string" && cmd.oneLineExample.length > 0,
      `command ${name} should have a non-empty oneLineExample`,
    );
  }
});

Deno.test("CommandFactory.get should throw CommandNotFoundError and suggest similar public commands", async () => {
  const logger = await TestHelper.setupTestLogger();
  const factory = new CommandFactory();
  const config = TestHelper.getConfig();

  assertThrows(
    () => factory.get("insatll", config),
    CommandNotFoundError,
    t("cmd.command_factory.notFound", { cmd: "insatll" }),
  );

  assertFind(logger.messages, (msg) => msg.includes(t("cmd.command_factory.didYouMean")));
  assertFind(logger.messages, (msg) => msg.includes("\tinstall"));

  // Internal hidden commands (starting with "_") must not be suggested
  logger.messages.length = 0;
  assertThrows(
    () => factory.get("_activate-machin", config),
    CommandNotFoundError,
  );
  assertEquals(logger.messages.some((msg) => msg.includes("_activate-machine")), false);
});

Deno.test("CommandFactory.get should throw CommandNotFoundError without suggestions for unrelated name", async () => {
  const logger = await TestHelper.setupTestLogger();
  const factory = new CommandFactory();
  const config = TestHelper.getConfig();

  assertThrows(
    () => factory.get("zzzzzzzzz", config),
    CommandNotFoundError,
    t("cmd.command_factory.notFound", { cmd: "zzzzzzzzz" }),
  );

  const hasDidYouMean = logger.messages.some((msg) => msg.includes(t("cmd.command_factory.didYouMean")));
  assertEquals(hasDidYouMean, false);
});
