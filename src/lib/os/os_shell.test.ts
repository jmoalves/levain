import { assert, assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
import { OsShell } from "./os_shell.ts";
import OsUtils from "./os_utils.ts";
import FileSystemPackage from "../package/file_system_package.ts";
import TestHelper from "../test/test_helper.ts";
import { PackageManagerMock } from "../package/package_manager_mock.ts";
import { assertArrayEndsWith } from "../test/more_asserts.ts";
import StringUtils from "../utils/string_utils.ts";

Deno.test("OsShell.adjustArgs should add quotation marks around parameters with spaces", () => {
  const args = ["noSpaces", "with spaces"];

  const adjustedArgs = OsShell.adjustArgs(args);

  const expectedArgs = ["noSpaces", '"with spaces"'];
  assertEquals(adjustedArgs, expectedArgs);
});

Deno.test("OsShell.prepareShellOptions should build cmd /d /c for non-secret commands", async () => {
  const config = TestHelper.getConfig();
  config.packageManager = new PackageManagerMock(config);
  const osShell = new OsShell(config, ["abc"], true);
  const args = ["noSpaces", "with spaces"];

  const shellOptions = await osShell.prepareShellOptions(args);

  assertEquals(shellOptions.exec_cmd, "cmd");
  assertEquals(shellOptions.args.slice(0, 2), ["/d", "/c"]);
  assertEquals(shellOptions.windowsRawArguments, undefined);
  assertArrayEndsWith(shellOptions.cmd, ["noSpaces", "with spaces"]);
});

Deno.test("OsShell.prepareShellOptions should pipe stdout and stderr when saveVar is set", async () => {
  const config = TestHelper.getConfig();
  config.packageManager = new PackageManagerMock(config);
  const osShell = new OsShell(config, ["abc"], true);
  osShell.saveVar = "CAPTURED";

  const shellOptions = await osShell.prepareShellOptions(["echo", "hello"]);

  assertEquals(shellOptions.stdout, "piped");
  assertEquals(shellOptions.stderr, "piped");
});

Deno.test("OsShell.prepareShellOptions should preserve spaces in interactive shellPath", async () => {
  const config = TestHelper.getConfig();
  const dir = TestHelper.getNewTempDir();
  const shellDir = `${dir}/Program Files`;
  await Deno.mkdir(shellDir, { recursive: true });
  const shellExe = `${shellDir}/custom-shell.exe`;
  await Deno.writeTextFile(shellExe, "");
  config.shellPath = shellExe;
  config.packageManager = new PackageManagerMock(config);

  const osShell = new OsShell(config, ["abc"], true);
  osShell.interactive = true;

  const shellOptions = await osShell.prepareShellOptions([]);
  assertEquals(shellOptions.cmd, ["cmd", "/c", "start", "", shellExe]);
});

Deno.test("OsShell should not mutate pkg cmd.shell or addpath.path across repeated executions", async () => {
  const config = TestHelper.getConfig();
  const pkg = new FileSystemPackage(
    config,
    "immutable-pkg",
    TestHelper.getNewTempDir(),
    "immutable-pkg.levain.yaml",
    [
      "version: 1.0.0",
      "cmd.shell:",
      "  - setEnv FROM_SHELL 1",
      "cmd.env:",
      "  - setEnv FROM_ENV 2",
    ].join("\n"),
  );

  const origShellCopy = [...pkg.yamlItem("cmd.shell")];
  const resolveStub = stub(config.packageManager, "resolvePackages", () => [pkg]);
  try {
    const osShell = new OsShell(config, ["immutable-pkg"], false);
    await osShell.execute([], false);
    await osShell.execute([], false);

    assertEquals(pkg.yamlItem("cmd.shell"), origShellCopy);

    // Verify getCmdPath via prepareEnv does not reverse/mutate addpath.path in place
    config.context.action = { addpath: { path: ["/first/dir", "/second/dir"] } };
    const env1: Record<string, string> = {};
    const env2: Record<string, string> = {};
    await osShell.prepareEnv(env1);
    await osShell.prepareEnv(env2);

    assertEquals(config.context.action.addpath.path, ["/first/dir", "/second/dir"]);
    assertEquals(env1.PATH, env2.PATH);
  } finally {
    resolveStub.restore();
  }
});

Deno.test("OsShell.prepareShellOptions should pass secrets via ephemeral env vars and redact logs", async () => {
  const config = TestHelper.getConfig();
  const secret = "p^a&s$s$$w%o!r|d<1>2 (3)";
  config.password = secret;
  config.packageManager = new PackageManagerMock(config);

  const osShell = new OsShell(config, ["abc"], true);
  const urlEncoded = StringUtils.encodeUrlComponent(secret);
  const opt = await osShell.prepareShellOptions([
    "tool",
    "hi!",
    "with space!",
    `--pass=${secret}`,
    `http://user:${urlEncoded}@proxy:8080`,
  ]);

  assertEquals(opt.windowsRawArguments, true);
  assertEquals(opt.exec_cmd, "cmd");
  assertEquals(opt.args.slice(0, 4), ["/s", "/d", "/v:on", "/c"]);
  assertEquals(opt.env["__LEVAIN_SECRET_0"], `--pass=${secret}`);
  assertEquals(opt.env["__LEVAIN_SECRET_1"], `http://user:${urlEncoded}@proxy:8080`);
  assert(opt.args[4].includes('"!__LEVAIN_SECRET_0!"'));
  assert(opt.args[4].includes('"!__LEVAIN_SECRET_1!"'));
  assert(opt.args[4].includes("hi^^!"));
  assert(opt.args[4].includes('"with space^!"'));
  assertEquals(opt.args[4].includes(secret), false, "raw secret must not appear in cmd args");
  assertEquals(opt.args[4].includes(urlEncoded), false, "url-encoded secret must not appear in cmd args");

  const redacted = OsShell.redactShellOptionsForLog(opt);
  assertEquals(redacted.env["__LEVAIN_SECRET_0"], "******");
  assertEquals(redacted.env["__LEVAIN_SECRET_1"], "******");
});

if (OsUtils.isWindows()) {
  Deno.test("OsShell.openShell on Windows should deliver raw and URL-encoded special-character passwords verbatim", async () => {
    const config = TestHelper.getConfig();
    const specialPassword = "p^a&s$s$$w%o!r|d<1>2 (3)";
    const urlToken = `http://user:${StringUtils.encodeUrlComponent(specialPassword)}@proxy:8080`;
    config.password = specialPassword;
    config.packageManager = new PackageManagerMock(config);

    // Raw special-character password through real cmd.exe
    const osShell1 = new OsShell(config, ["abc"], true);
    osShell1.saveVar = "RAW_OUT";
    osShell1.stripCRLF = true;
    await osShell1.openShell([Deno.execPath(), "eval", "console.log(Deno.args[0])", specialPassword]);
    assertEquals(config.getVar("RAW_OUT"), specialPassword);

    // URL-encoded password containing multiple %XX sequences through real cmd.exe
    const osShell2 = new OsShell(config, ["abc"], true);
    osShell2.saveVar = "URL_OUT";
    osShell2.stripCRLF = true;
    await osShell2.openShell([Deno.execPath(), "eval", "console.log(Deno.args[0])", urlToken]);
    assertEquals(config.getVar("URL_OUT"), urlToken);
  });
}
