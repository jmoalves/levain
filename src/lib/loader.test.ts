import { assert, assertEquals, assertRejects } from "@std/assert";

import TestHelper from "./test/test_helper.ts";
import { assertFind } from "./test/more_asserts.ts";
import Loader from "./loader.ts";
import { CommandNotFoundError } from "../cmd/command_factory.ts";

Deno.test("Loader.loadCommandFactory and loadActionFactory should cache factory instances", async () => {
  const loader = new Loader(TestHelper.getConfig());

  const cmdFactory1 = await loader.loadCommandFactory();
  const cmdFactory2 = await loader.loadCommandFactory();
  assert(cmdFactory1 === cmdFactory2);

  const actionFactory1 = await loader.loadActionFactory();
  const actionFactory2 = await loader.loadActionFactory();
  assert(actionFactory1 === actionFactory2);
});

Deno.test("Loader.command should dispatch registered commands and reject unknown ones", async () => {
  const logger = await TestHelper.setupTestLogger();
  const loader = new Loader(TestHelper.getConfig());

  await loader.command("actions", ["json"]);
  assertFind(logger.messages, (msg) => msg.includes('actions "json"'));

  await assertRejects(
    async () => await loader.command("unknown-command-xyz", []),
    CommandNotFoundError,
  );
});

Deno.test("Loader.action should handle quotes, resolve variables, and execute action", async () => {
  const config = TestHelper.getConfig();
  config.setVar("GREETING", "hello");
  const loader = new Loader(config);

  await loader.action(undefined, 'setEnv COMBINED_VAL "${GREETING} world"');

  assertEquals(config.getVar("COMBINED_VAL"), "hello world");
});

Deno.test("Loader.action should throw when action name is unknown or empty", async () => {
  const loader = new Loader(TestHelper.getConfig());

  await assertRejects(
    async () => await loader.action(undefined, "noSuchAction arg1"),
    Error,
    "noSuchAction",
  );

  await assertRejects(
    async () => await loader.action(undefined, ""),
    Error,
  );
});
