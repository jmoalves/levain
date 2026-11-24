import { assert, assertEquals } from "@std/assert";

import ActionFactory from "../action/action_factory.ts";
import TestHelper from "../lib/test/test_helper.ts";
import { assertFind } from "../lib/test/more_asserts.ts";

import ActionsCommand from "./actions.ts";
import CommandFactory from "./command_factory.ts";

Deno.test("ActionsCommand should be registered in CommandFactory", () => {
  const factory = new CommandFactory();
  const cmd = factory.get("actions", TestHelper.getConfig());
  assert(cmd instanceof ActionsCommand);
});

Deno.test("ActionsCommand should list all registered actions sorted alphabetically", async () => {
  const logger = await TestHelper.setupTestLogger();
  const cmd = new ActionsCommand(TestHelper.getConfig());

  cmd.execute([]);

  const expectedActions = new ActionFactory().list().sort();
  const listedActions = logger.messages
    .filter((msg) => msg.startsWith("INFO   "))
    .map((msg) => msg.slice("INFO   ".length));

  assertFind(logger.messages, (msg) => msg.includes('actions ""'));
  assertEquals(listedActions, expectedActions);
});

Deno.test("ActionsCommand should filter actions case-insensitively by search text", async () => {
  const logger = await TestHelper.setupTestLogger();
  const cmd = new ActionsCommand(TestHelper.getConfig());

  cmd.execute(["JSON"]);

  const listedActions = logger.messages
    .filter((msg) => msg.startsWith("INFO   "))
    .map((msg) => msg.slice("INFO   ".length));

  assertFind(logger.messages, (msg) => msg.includes('actions "JSON"'));
  assertEquals(listedActions, ["jsonGet", "jsonRemove", "jsonSet"]);
});

Deno.test("ActionsCommand should suggest similar actions on typo and list nothing for unrelated search", async () => {
  const logger = await TestHelper.setupTestLogger();
  const cmd = new ActionsCommand(TestHelper.getConfig());

  cmd.execute(["jsonSt"]);
  assertFind(logger.messages, (msg) => msg.includes("jsonSet"));

  logger.messages.length = 0;
  cmd.execute(["definitely-no-action-matches"]);
  const listedActions = logger.messages.filter((msg) => msg.startsWith("INFO   "));
  assertEquals(listedActions, []);
});
