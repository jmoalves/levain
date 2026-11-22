import { assert, assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";

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

Deno.test("Activate.execute should log instructions and exit with status 1", async () => {
  const logger = await TestHelper.setupTestLogger();
  const exitCodes: (number | undefined)[] = [];
  const exitStub = stub(Deno, "exit", (code?: number): never => {
    exitCodes.push(code);
    return undefined as never;
  });

  try {
    const cmd = new Activate(TestHelper.getConfig());
    await cmd.execute([]);

    assertFind(logger.messages, (msg) => msg.includes(t("cmd.activate.installMissing")));
    assertFind(logger.messages, (msg) => msg.includes("levain _activate-machine init"));
    assertEquals(exitCodes, [1]);
  } finally {
    exitStub.restore();
  }
});
