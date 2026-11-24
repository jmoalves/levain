import { assert, assertRejects } from "@std/assert";

import t from "../lib/i18n.ts";
import TestHelper from "../lib/test/test_helper.ts";
import { assertFind } from "../lib/test/more_asserts.ts";

import Activate from "./activate.ts";
import CommandFactory from "./command_factory.ts";

Deno.test("Activate should be registered in CommandFactory", () => {
  const factory = new CommandFactory();
  const cmd = factory.get("activate", TestHelper.getConfig());
  assert(cmd instanceof Activate);
});

Deno.test("Activate.execute should log instructions and throw an Error instead of calling Deno.exit", async () => {
  const logger = await TestHelper.setupTestLogger();
  const cmd = new Activate(TestHelper.getConfig());

  await assertRejects(
    async () => await cmd.execute([]),
    Error,
    "levain _activate-machine init",
  );

  assertFind(logger.messages, (msg) => msg.includes(t("cmd.activate.installMissing")));
  assertFind(logger.messages, (msg) => msg.includes("levain _activate-machine init"));
});
