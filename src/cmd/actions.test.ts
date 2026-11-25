import { assert, assertEquals } from "@std/assert";

import ActionFactory from "../action/action_factory.ts";
import { ActionDocs } from "../action/action_docs.ts";
import t from "../lib/i18n.ts";
import TestHelper from "../lib/test/test_helper.ts";
import { assertFind } from "../lib/test/more_asserts.ts";

import ActionsCommand from "./actions.ts";
import CommandFactory from "./command_factory.ts";

Deno.test("ActionsCommand should be registered in CommandFactory", () => {
  const factory = new CommandFactory();
  const cmd = factory.get("actions", TestHelper.getConfig());
  assert(cmd instanceof ActionsCommand);
});

Deno.test("ActionsCommand should list all registered actions sorted alphabetically with summaries and hint", async () => {
  const logger = await TestHelper.setupTestLogger();
  const cmd = new ActionsCommand(TestHelper.getConfig());

  cmd.execute([]);

  const expectedActions = new ActionFactory().list().sort();
  const listedLines = logger.messages.filter((msg) => msg.startsWith("INFO   "));
  const listedNames = listedLines.map((msg) => msg.slice("INFO   ".length).trim().split(/\s+/)[0]);

  assertFind(logger.messages, (msg) => msg.includes('actions ""'));
  assertEquals(listedNames, expectedActions);
  // Every listed action line includes its localized summary
  for (const name of expectedActions) {
    assertFind(listedLines, (line) => line.includes(name) && line.includes(ActionDocs.summary(name)));
  }
  // Unfiltered output includes tip to filter for usage syntax
  assertFind(logger.messages, (msg) => msg.includes(t("cmd.actions.hint")));
});

Deno.test("ActionsCommand should filter by name or summary and include usage syntax when filtered", async () => {
  const logger = await TestHelper.setupTestLogger();
  const cmd = new ActionsCommand(TestHelper.getConfig());

  cmd.execute(["JSON"]);

  const actionLines = logger.messages.filter((msg) => msg.startsWith("INFO   ") && !msg.startsWith("INFO     "));
  const listedNames = actionLines.map((msg) => msg.slice("INFO   ".length).trim().split(/\s+/)[0]);

  assertFind(logger.messages, (msg) => msg.includes('actions "JSON"'));
  assertEquals(listedNames, ["jsonGet", "jsonRemove", "jsonSet"]);
  assertFind(
    logger.messages,
    (msg) => msg.includes(`${t("cmd.actions.usageLabel")}: ${ActionDocs.get("jsonSet")!.usage}`),
  );

  // Filtering by summary keyword also matches actions accent-insensitively
  logger.messages.length = 0;
  const extractWord = ActionDocs.summary("extract").split(/\s+/).find((w) => w.length >= 6)!
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  cmd.execute([extractWord]);
  assertFind(logger.messages, (msg) => msg.includes("extract") && msg.includes(ActionDocs.summary("extract")));
});

Deno.test("ActionsCommand should report noneFound, suggest similar actions on typo, and handle unrelated search", async () => {
  const logger = await TestHelper.setupTestLogger();
  const cmd = new ActionsCommand(TestHelper.getConfig());

  cmd.execute(["jsonSt"]);
  assertFind(logger.messages, (msg) => msg.includes(t("cmd.actions.noneFound", { search: "jsonSt" })));
  assertFind(logger.messages, (msg) => msg.includes(t("cmd.actions.didYouMean")));
  assertFind(logger.messages, (msg) => msg.includes("jsonSet"));

  logger.messages.length = 0;
  cmd.execute(["definitely-no-action-matches"]);
  assertFind(
    logger.messages,
    (msg) => msg.includes(t("cmd.actions.noneFound", { search: "definitely-no-action-matches" })),
  );
});
