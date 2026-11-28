import { assert, assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";

import { OsShell } from "../lib/os/os_shell.ts";
import PackageManager from "../lib/package/package_manager.ts";
import { type ShellToken, tokenizeShellArgs } from "../lib/parse_args.ts";
import TestHelper from "../lib/test/test_helper.ts";
import ActionFactory from "./action_factory.ts";
import LevainShell from "./levainShell.ts";

Deno.test("LevainShell should be registered in ActionFactory", () => {
  const action = new ActionFactory().get("levainShell", TestHelper.getConfig());
  assert(action instanceof LevainShell);
});

Deno.test("LevainShell should throw when pkg is undefined", async () => {
  const action = new LevainShell(TestHelper.getConfig());

  await assertRejects(
    async () => await action.execute(undefined, ["echo", "hi"]),
    Error,
    "No package for action levainShell",
  );
});

Deno.test("LevainShell should configure OsShell options and pass remaining command tokens", async () => {
  const config = TestHelper.getConfig();
  const pkg = TestHelper.mockPackage();
  const captured: Array<{
    args: string[];
    saveVar: string | undefined;
    interactive: boolean;
    stripCRLF: boolean;
    ignoreErrors: boolean;
  }> = [];

  const resolveStub = stub(PackageManager.prototype, "resolvePackages", () => [pkg]);
  const execStub = stub(OsShell.prototype, "execute", function (this: OsShell, args: string[]) {
    captured.push({
      args,
      saveVar: this.saveVar,
      interactive: this.interactive,
      stripCRLF: this.stripCRLF,
      ignoreErrors: this.ignoreErrors,
    });
    return Promise.resolve();
  });

  try {
    const action = new LevainShell(config);
    await action.execute(pkg, [
      "--saveVar=CMD_OUT",
      "--stripCRLF",
      "--ignoreErrors",
      "git",
      "--version",
      "&&",
      "echo",
      "ok",
    ]);

    assertEquals(captured, [{
      args: ["git", "--version", "&&", "echo", "ok"],
      saveVar: "CMD_OUT",
      interactive: false,
      stripCRLF: true,
      ignoreErrors: true,
    }]);
  } finally {
    execStub.restore();
    resolveStub.restore();
  }
});

Deno.test("LevainShell.executeShellTokens should parse leading flags, handle --, and forward structured tokens", async () => {
  const config = TestHelper.getConfig();
  const pkg = TestHelper.mockPackage();
  const action = new LevainShell(config);

  await assertRejects(
    async () => await action.executeShellTokens(undefined, tokenizeShellArgs("echo hi")),
    Error,
    "No package for action levainShell",
  );

  const captured: Array<{ args: string[]; tokens: ShellToken[] | undefined; saveVar: string | undefined; stripCRLF: boolean }> = [];
  const resolveStub = stub(PackageManager.prototype, "resolvePackages", () => [pkg]);
  const execStub = stub(OsShell.prototype, "execute", function (this: OsShell, args: string[]) {
    captured.push({ args, tokens: this.shellTokens, saveVar: this.saveVar, stripCRLF: this.stripCRLF });
    return Promise.resolve();
  });

  try {
    await action.executeShellTokens(pkg, tokenizeShellArgs("--saveVar OUT --stripCRLF echo secret| cat"));
    await action.executeShellTokens(pkg, tokenizeShellArgs("-- -flag-cmd| cat"));

    assertEquals(captured[0].saveVar, "OUT");
    assertEquals(captured[0].stripCRLF, true);
    assertEquals(captured[0].args, ["echo", "secret", "|", "cat"]);
    assertEquals(captured[0].tokens, [
      { value: "echo", isOperator: false, precededBySpace: true },
      { value: "secret", isOperator: false, precededBySpace: true },
      { value: "|", isOperator: true, precededBySpace: false },
      { value: "cat", isOperator: false, precededBySpace: true },
    ]);
    assertEquals(captured[1].tokens?.[0], { value: "-flag-cmd", isOperator: false, precededBySpace: true });
    assertEquals(captured[1].tokens?.[1], { value: "|", isOperator: true, precededBySpace: false });
  } finally {
    execStub.restore();
    resolveStub.restore();
  }
});
