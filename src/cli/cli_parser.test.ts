import { assert, assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { stub } from "@std/testing/mock";

import LevainVersion from "../levain_version.ts";
import t from "../lib/i18n.ts";
import { CliValidationError, getCliHelpText, parseCliArgs } from "./cli_parser.ts";

Deno.test("cli_parser should parse all global flags and map them to Levain myArgs keys", async () => {
  const result = await parseCliArgs([
    "--levainHome",
    "/home/one",
    "--levainHome=/home/two",
    "--addRepo",
    "https://example.org/repo1.git",
    "--addRepo=https://example.org/repo2.git",
    "--tempRepo",
    "/tmp/repo",
    "--add-log",
    "/tmp/a.log",
    "--add-log-dir",
    "/tmp/logs",
    "--email-domain",
    "example.org",
    "--levainCache",
    "/tmp/cache",
    "--shellPath",
    "/bin/bash",
    "--ask-fullname",
    "--ask-login",
    "--ask-email",
    "--ask-password",
    "--wait-to-begin",
    "--wait-after-end",
    "--skip-levain-updates",
    "--skip-auto-clean",
    "--levain-upgrade",
    "--is_compiled_binary",
  ]);

  assertEquals(result.kind, "run");
  if (result.kind === "run") {
    assertEquals(result.myArgs.levainHome, ["/home/one", "/home/two"]);
    assertEquals(result.myArgs.addRepo, [
      "https://example.org/repo1.git",
      "https://example.org/repo2.git",
    ]);
    assertEquals(result.myArgs.tempRepo, ["/tmp/repo"]);
    assertEquals(result.myArgs["add-log"], ["/tmp/a.log"]);
    assertEquals(result.myArgs["add-log-dir"], ["/tmp/logs"]);
    assertEquals(result.myArgs["email-domain"], "example.org");
    assertEquals(result.myArgs.levainCache, "/tmp/cache");
    assertEquals(result.myArgs.shellPath, "/bin/bash");
    assertEquals(result.myArgs["ask-fullname"], true);
    assertEquals(result.myArgs["ask-login"], true);
    assertEquals(result.myArgs["ask-email"], true);
    assertEquals(result.myArgs["ask-password"], true);
    assertEquals(result.myArgs["wait-to-begin"], true);
    assertEquals(result.myArgs["wait-after-end"], true);
    assertEquals(result.myArgs["skip-levain-updates"], true);
    assertEquals(result.myArgs["skip-auto-clean"], true);
    assertEquals(result.myArgs["levain-upgrade"], true);
    assertEquals(result.myArgs["is_compiled_binary"], true);
    assertEquals(result.myArgs._, []);
  }

  const compiledCmd = await parseCliArgs(["--is_compiled_binary", "install", "jdk"]);
  assertEquals(compiledCmd.kind, "run");
  if (compiledCmd.kind === "run") {
    assertEquals(compiledCmd.myArgs["is_compiled_binary"], true);
    assertEquals(compiledCmd.myArgs._, ["install", "jdk"]);
  }
});

Deno.test("cli_parser should route every public command, subcommand flags, global flags after subcommand, and -- literal args", async () => {
  const cases: Array<{ input: string[]; expectedPositional: string[] }> = [
    {
      input: ["install", "--force", "--noUpdate", "jdk", "git"],
      expectedPositional: ["install", "--force", "--noUpdate", "jdk", "git"],
    },
    {
      input: ["install", "--force", "--", "jdk", "-extra"],
      expectedPositional: ["install", "--force", "--", "jdk", "-extra"],
    },
    { input: ["update", "--force", "jdk"], expectedPositional: ["update", "--force", "jdk"] },
    { input: ["update", "--", "jdk"], expectedPositional: ["update", "--", "jdk"] },
    { input: ["shell", "jdk"], expectedPositional: ["shell", "jdk"] },
    { input: ["shell", "--", "-21"], expectedPositional: ["shell", "-21"] },
    { input: ["activate", "--skip-pre", "jdk"], expectedPositional: ["activate", "--skip-pre", "jdk"] },
    { input: ["activate", "--", "-21"], expectedPositional: ["activate", "-21"] },
    { input: ["list", "jdk"], expectedPositional: ["list", "jdk"] },
    { input: ["list", "--", "-21"], expectedPositional: ["list", "-21"] },
    {
      input: ["clean", "--cache", "--backup", "--temp", "--logs", "--all", "--deep"],
      expectedPositional: ["clean", "--cache", "--backup", "--temp", "--logs", "--all", "--deep"],
    },
    { input: ["actions", "json"], expectedPositional: ["actions", "json"] },
    { input: ["actions", "--", "-env"], expectedPositional: ["actions", "-env"] },
    { input: ["info", "--verbose", "jdk"], expectedPositional: ["info", "--verbose", "jdk"] },
    { input: ["info", "--", "jdk"], expectedPositional: ["info", "--", "jdk"] },
    { input: ["explain"], expectedPositional: ["explain"] },
    { input: ["explain", "--raw", "jdk"], expectedPositional: ["explain", "--raw", "jdk"] },
    { input: ["explain", "--uninstall"], expectedPositional: ["explain", "--uninstall"] },
    { input: ["explain", "--uninstall", "jdk"], expectedPositional: ["explain", "--uninstall", "jdk"] },
    { input: ["explain", "jdk"], expectedPositional: ["explain", "jdk"] },
    { input: ["explain", "jdk", "--", "-extra"], expectedPositional: ["explain", "jdk", "--", "-extra"] },
    {
      input: ["clone", "--dirs", "https://example.org/org/repo.git"],
      expectedPositional: ["clone", "--dirs", "https://example.org/org/repo.git"],
    },
    {
      input: ["_activate-machine", "cmd", "--shell", "powershell", "pkgA"],
      expectedPositional: ["_activate-machine", "cmd", "--shell", "powershell", "pkgA"],
    },
  ];

  for (const testCase of cases) {
    const result = await parseCliArgs(testCase.input);
    assertEquals(result.kind, "run");
    if (result.kind === "run") {
      assertEquals(result.myArgs._, testCase.expectedPositional);
    }
  }

  const globalAfterSub = await parseCliArgs(["install", "jdk", "--skip-auto-clean", "--levainHome", "/tmp/home"]);
  assertEquals(globalAfterSub.kind, "run");
  if (globalAfterSub.kind === "run") {
    assertEquals(globalAfterSub.myArgs["skip-auto-clean"], true);
    assertEquals(globalAfterSub.myArgs.levainHome, ["/tmp/home"]);
    assertEquals(globalAfterSub.myArgs._, ["install", "jdk"]);
  }
});

Deno.test("cli_parser should handle --version and --help without dispatching commands and hide internal flags/commands", async () => {
  const output: string[] = [];
  const logStub = stub(console, "log", (...args: unknown[]) => {
    output.push(args.map(String).join(" "));
  });

  try {
    const versionRes = await parseCliArgs(["--version"]);
    assertEquals(versionRes.kind, "handled");
    assert(output.some((line) => line.includes(LevainVersion.levainVersion.versionNumber)));

    output.length = 0;
    const helpRes = await parseCliArgs(["--help"]);
    assertEquals(helpRes.kind, "handled");
    const renderedHelp = output.join("\n");
    assertStringIncludes(renderedHelp, "install");
    assertStringIncludes(renderedHelp, "clean");
    assertEquals(renderedHelp.includes("_activate-machine"), false);
    assertEquals(renderedHelp.includes("--levain-upgrade"), false);
    assertEquals(renderedHelp.includes("--is_compiled_binary"), false);
  } finally {
    logStub.restore();
  }

  const helpText = getCliHelpText();
  assertStringIncludes(helpText, "install");
  assertStringIncludes(helpText, "levain explain maven");
  assertEquals(helpText.includes("_activate-machine"), false);
  assertEquals(helpText.includes("--levain-upgrade"), false);
  // Plain help text for logs must not contain ANSI escape codes
  assertEquals(helpText.includes("\x1b["), false);
});

Deno.test("cli_parser should reject unknown commands, unknown options, and invalid arity with localized suggestions", async () => {
  // Transposition ("insatll") caught by Damerau-Levenshtein
  await assertRejects(
    async () => await parseCliArgs(["insatll"]),
    CliValidationError,
    "install",
  );

  await assertRejects(
    async () => await parseCliArgs(["--skip-auto-clen"]),
    CliValidationError,
    "--skip-auto-clean",
  );

  await assertRejects(
    async () => await parseCliArgs(["install", "--forc", "git"]),
    CliValidationError,
    "--force",
  );

  await assertRejects(
    async () => await parseCliArgs(["clean", "--cach"]),
    CliValidationError,
    "--cache",
  );

  // Short unknown option like "-z" must NOT produce false-positive suggestions
  const shortOptErr = await assertRejects(
    async () => await parseCliArgs(["install", "-z", "git"]),
    CliValidationError,
    t("cli.error.unknownOption", { option: "-z" }),
  );
  assertEquals(shortOptErr.message.includes("--force"), false);

  // Unknown option suggestion for explain (--raw, --uninstall) and required arity checks for clone
  await assertRejects(
    async () => await parseCliArgs(["explain", "--ra", "jdk"]),
    CliValidationError,
    "--raw",
  );
  await assertRejects(
    async () => await parseCliArgs(["explain", "--uninstal", "jdk"]),
    CliValidationError,
    "--uninstall",
  );
  await assertRejects(
    async () => await parseCliArgs(["explain", "--raw", "--uninstall", "jdk"]),
    CliValidationError,
    t("cmd.explain.uninstall.rawConflict"),
  );
  await assertRejects(
    async () => await parseCliArgs(["uninstall", "jdk"]),
    CliValidationError,
    "levain explain --uninstall",
  );
  await assertRejects(async () => await parseCliArgs(["clone"]), CliValidationError);
  await assertRejects(
    async () => await parseCliArgs(["clone", "https://example.org/a.git", "https://example.org/b.git"]),
    CliValidationError,
  );
});
