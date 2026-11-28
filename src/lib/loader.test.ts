import { assert, assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";

import TestHelper from "./test/test_helper.ts";
import { assertFind } from "./test/more_asserts.ts";
import Loader from "./loader.ts";
import { CommandNotFoundError } from "../cmd/command_factory.ts";
import { OsShell } from "./os/os_shell.ts";
import PackageManager from "./package/package_manager.ts";
import type { ShellToken } from "./parse_args.ts";

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

Deno.test("Loader.action should tokenize attached levainShell operators before resolving variables", async () => {
  const config = TestHelper.getConfig();
  config.password = "p|w&>secret";
  config.login = "jdoe";
  const pkg = TestHelper.mockPackage();
  const loader = new Loader(config);

  let capturedTokens: ShellToken[] | undefined = [];
  const resolveStub = stub(PackageManager.prototype, "resolvePackages", () => [pkg]);
  const execStub = stub(OsShell.prototype, "execute", function (this: OsShell) {
    capturedTokens = this.shellTokens;
    return Promise.resolve();
  });

  try {
    await loader.action(
      pkg,
      "levainShell --saveVar=out echo ${levain.password}| cntlm -u ${levain.login} 2>nul",
    );

    assertEquals(capturedTokens, [
      { value: "echo", isOperator: false, precededBySpace: true },
      // Operators inside the resolved password value are never treated as shell operators
      { value: "p|w&>secret", isOperator: false, precededBySpace: true },
      { value: "|", isOperator: true, precededBySpace: false },
      { value: "cntlm", isOperator: false, precededBySpace: true },
      { value: "-u", isOperator: false, precededBySpace: true },
      { value: "jdoe", isOperator: false, precededBySpace: true },
      { value: "2>", isOperator: true, precededBySpace: true },
      { value: "nul", isOperator: false, precededBySpace: false },
    ]);
  } finally {
    execStub.restore();
    resolveStub.restore();
  }
});
