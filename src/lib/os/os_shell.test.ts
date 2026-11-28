import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import * as path from "@std/path";
import { stub } from "@std/testing/mock";
import { OsShell } from "./os_shell.ts";
import OsUtils from "./os_utils.ts";
import LevainVersion from "../../levain_version.ts";
import FileSystemPackage from "../package/file_system_package.ts";
import TestHelper from "../test/test_helper.ts";
import { PackageManagerMock } from "../package/package_manager_mock.ts";
import { tokenizeShellArgs } from "../parse_args.ts";
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
    assert(env1.PATH.includes(`/second/dir${path.DELIMITER}/first/dir`));
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

  const redacted = OsShell.redactShellOptionsForLog(opt, [secret, urlEncoded]);
  assertEquals(redacted.env["__LEVAIN_SECRET_0"], "******");
  assertEquals(redacted.env["__LEVAIN_SECRET_1"], "******");
});

Deno.test("OsShell.prepareShellOptions should reject CR/LF/NUL, guard .cmd/.bat quotes, and escape carets/quotes", async () => {
  const config = TestHelper.getConfig();
  const secretWithQuoteAndSlash = 'p^a"s\\';
  config.password = secretWithQuoteAndSlash;
  config.context.action = {
    setEnv: {
      env: {
        __LEVAIN_SECRET_0: "should-be-overwritten",
        HTTP_PROXY: `http://u:${secretWithQuoteAndSlash}@proxy`,
      },
    },
  };
  config.packageManager = new PackageManagerMock(config);
  const osShell = new OsShell(config, ["abc"], true);

  await assertRejects(
    async () => await osShell.prepareShellOptions(["echo", "line1\nline2"]),
    Error,
    "CR, LF, or NUL",
  );
  await assertRejects(
    async () => await osShell.prepareShellOptions(["mvn.cmd", secretWithQuoteAndSlash]),
    Error,
    ".cmd/.bat",
  );

  const opt = await osShell.prepareShellOptions([
    "tool.exe",
    "",
    "a ^!__LEVAIN_SECRET_0^!",
    "^^!bang",
    secretWithQuoteAndSlash,
  ]);
  // MSVCRT-escaped embedded quote and trailing backslash, overwriting any pre-existing setEnv collision
  assertEquals(opt.env["__LEVAIN_SECRET_0"], 'p^a\\"s\\\\');
  assert(opt.args[4].includes('""'));
  assert(opt.args[4].includes('"a ^^^!__LEVAIN_SECRET_0^^^!"'));
  assert(opt.args[4].includes("^^^^^^^^^^!bang"));

    const redacted = OsShell.redactShellOptionsForLog(opt, [secretWithQuoteAndSlash]);
  assertEquals(redacted.env["__LEVAIN_SECRET_0"], "******");
  assertEquals(redacted.env["HTTP_PROXY"], "http://u:******@proxy");
});

Deno.test("OsShell.prepareShellOptionsFromTokens preserves attached operators for echo secrets and plain commands", async () => {
  const config = TestHelper.getConfig();
  const secret = 'p^a&s$s%o!r|d<1>2 (3)"\\';
  config.password = secret;
  config.packageManager = new PackageManagerMock(config);
  const osShell = new OsShell(config, ["abc"], true);

  // 1. Piped `echo <secret>| cntlm ...` defers expansion into sub-cmd so pipe child never re-parses secret metacharacters
  const echoPipeTokens = tokenizeShellArgs("echo __PW__| cntlm -H -d DOMAIN -u jdoe 2>nul").map((t) =>
    t.value === "__PW__" ? { ...t, value: secret } : t
  );
  const echoPipeOpt = await osShell.prepareShellOptionsFromTokens(echoPipeTokens);
  assertEquals(echoPipeOpt.windowsRawArguments, true);
  assertEquals(echoPipeOpt.args.slice(0, 4), ["/s", "/d", "/v:on", "/c"]);
  assertEquals(echoPipeOpt.args[4], '"cmd /s /d /v:on /c "echo(^!__LEVAIN_SECRET_0^!)"| cntlm -H -d DOMAIN -u jdoe 2>nul"');
  assertEquals(echoPipeOpt.env["__LEVAIN_SECRET_0"], secret);

  // 2. Parenthesized `(echo <secret>) | cntlm -H`
  const parenTokens = tokenizeShellArgs("(echo __PW__) | cntlm -H").map((t) =>
    t.value === "__PW__" ? { ...t, value: secret } : t
  );
  const parenOpt = await osShell.prepareShellOptionsFromTokens(parenTokens);
  assertEquals(parenOpt.args[4], '"(cmd /s /d /v:on /c "echo(^!__LEVAIN_SECRET_0^!)") | cntlm -H"');

  // 3. `echo prefix <secret>>out.txt` (non-piped echo with secret packs operands directly into `echo(!VAR!`)
  const multiEchoTokens = tokenizeShellArgs("echo prefix __PW__>out.txt").map((t) =>
    t.value === "__PW__" ? { ...t, value: secret } : t
  );
  const multiEchoOpt = await osShell.prepareShellOptionsFromTokens(multiEchoTokens);
  assertEquals(multiEchoOpt.args[4], '"echo(!__LEVAIN_SECRET_0!>out.txt"');
  assertEquals(multiEchoOpt.env["__LEVAIN_SECRET_0"], `prefix ${secret}`);

  // 4. Non-secret attached operators (with path containing spaces and empty arg)
  const plainTokens = tokenizeShellArgs('echo "-vm">>"C:\\Program Files\\App\\app.ini"&&echo ""|cat');
  const plainOpt = await osShell.prepareShellOptionsFromTokens(plainTokens);
  assertEquals(plainOpt.windowsRawArguments, true);
  assertEquals(plainOpt.args.slice(0, 3), ["/s", "/d", "/c"]);
  assertEquals(plainOpt.args[3], '"echo -vm>>"C:\\Program Files\\App\\app.ini"&&echo ""|cat"');
});

if (OsUtils.isWindows()) {
  Deno.test("OsShell.openShell on Windows should deliver raw and URL-encoded special-character passwords verbatim", async () => {
    const config = TestHelper.getConfig();
    const specialPassword = 'p^a&s$s$$w%o!r|d<1>2 (3)"\\';
    const urlToken = `http://user:${StringUtils.encodeUrlComponent(specialPassword)}@proxy:8080`;
    config.password = specialPassword;
    config.packageManager = new PackageManagerMock(config);

    // Raw special-character password (including embedded quote & trailing backslash) through real cmd.exe
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

    // Non-secret argument containing ^!__LEVAIN_SECRET_0^! must not expand the secret
    const osShell3 = new OsShell(config, ["abc"], true);
    osShell3.saveVar = "NO_LEAK_OUT";
    osShell3.stripCRLF = true;
    await osShell3.openShell([
      Deno.execPath(),
      "eval",
      "console.log(Deno.args[0])",
      "safe ^!__LEVAIN_SECRET_0^!",
      specialPassword,
    ]);
    assertEquals(config.getVar("NO_LEAK_OUT"), "safe ^!__LEVAIN_SECRET_0^!");
  });

  Deno.test("OsShell.openShell on Windows should not hang when a script leaves a background process holding pipes open", async () => {
    const config = TestHelper.getConfig();
    config.packageManager = new PackageManagerMock(config);
    const logger = await TestHelper.setupTestLogger();

    const tempDir = TestHelper.getNewTempDir();
    const scriptPath = path.join(tempDir, "launch-daemon.cmd");
    // Launches a ~7s background process inheriting stdout/stderr handles while the parent .cmd exits immediately
    await Deno.writeTextFile(
      scriptPath,
      [
        "@echo off",
        "echo daemon-launching",
        'start "" /b ping -n 8 127.0.0.1',
      ].join("\r\n") + "\r\n",
    );

    const osShell = new OsShell(config, ["abc"], true);
    const startMs = Date.now();
    await osShell.openShell([scriptPath]);
    const elapsedMs = Date.now() - startMs;

    assert(elapsedMs < 3500, `openShell should return promptly after parent .cmd exits, took ${elapsedMs}ms`);
    assert(logger.messages.some((m) => m.includes("daemon-launching")));
  });

  Deno.test("OsShell.executeTokens on Windows pipes echo secret without trailing space or quotes and supports attached redirects", async () => {
    const config = TestHelper.getConfig();
    const specialPassword = 'p^a&s$s$$w%o!r|d<1>2 (3)"\\';
    config.password = specialPassword;
    config.packageManager = new PackageManagerMock(config);

    // Pipe `echo <secret>| deno eval ...` reading raw stdin line
    const readStdinJs = "const buf = await new Response(Deno.stdin.readable).text(); console.log(buf.replace(/\\r?\\n$/, ''));";
    const pipeTokens = [
      { value: "echo", isOperator: false, precededBySpace: true },
      { value: specialPassword, isOperator: false, precededBySpace: true },
      { value: "|", isOperator: true, precededBySpace: false },
      { value: Deno.execPath(), isOperator: false, precededBySpace: true },
      { value: "eval", isOperator: false, precededBySpace: true },
      { value: readStdinJs, isOperator: false, precededBySpace: true },
    ];
    const shell1 = new OsShell(config, ["abc"], true);
    shell1.saveVar = "PIPED_SECRET";
    shell1.stripCRLF = true;
    shell1.shellTokens = pipeTokens;
    await shell1.execute(pipeTokens.map((t) => t.value), true);
    assertEquals(config.getVar("PIPED_SECRET"), specialPassword);

    // Parenthesized `(echo <secret>) | deno eval ...`
    const parenTokens = [
      { value: "(", isOperator: true, precededBySpace: true },
      { value: "echo", isOperator: false, precededBySpace: false },
      { value: specialPassword, isOperator: false, precededBySpace: true },
      { value: ")", isOperator: true, precededBySpace: false },
      { value: "|", isOperator: true, precededBySpace: true },
      { value: Deno.execPath(), isOperator: false, precededBySpace: true },
      { value: "eval", isOperator: false, precededBySpace: true },
      { value: readStdinJs, isOperator: false, precededBySpace: true },
    ];
    const shell2 = new OsShell(config, ["abc"], true);
    shell2.saveVar = "PAREN_SECRET";
    shell2.stripCRLF = true;
    shell2.shellTokens = parenTokens;
    await shell2.execute(parenTokens.map((t) => t.value), true);
    assertEquals(config.getVar("PAREN_SECRET"), specialPassword);

    // Non-secret attached redirect into a path containing spaces (`echo "-vm">><file>`)
    const dirWithSpaces = path.join(TestHelper.getNewTempDir(), "Program Files");
    await Deno.mkdir(dirWithSpaces, { recursive: true });
    const outFile = path.join(dirWithSpaces, "app.ini");
    const redirTokens = tokenizeShellArgs(`echo "-vm">>"${outFile}"`);
    const shell3 = new OsShell(config, ["abc"], true);
    shell3.shellTokens = redirTokens;
    await shell3.execute(redirTokens.map((t) => t.value), true);
    assertEquals((await Deno.readTextFile(outFile)).trimEnd(), "-vm");

    // Non-piped secret redirect (`echo <secret>><file>`) without trailing space
    const secretFile = path.join(dirWithSpaces, "secret.txt");
    const secretRedirTokens = tokenizeShellArgs(`echo __PW__>"${secretFile}"`).map((t) =>
      t.value === "__PW__" ? { ...t, value: specialPassword } : t
    );
    const shell4 = new OsShell(config, ["abc"], true);
    shell4.shellTokens = secretRedirTokens;
    await shell4.execute(secretRedirTokens.map((t) => t.value), true);
    assertEquals((await Deno.readTextFile(secretFile)).replace(/\r?\n$/, ""), specialPassword);
  });
}

Deno.test("OsShell constructor throws when dependencies cannot be resolved and execute blocks recursive levainShell", async () => {
  const config = TestHelper.getConfig();
  const nullResolveStub = stub(config.packageManager, "resolvePackages", () => null);
  try {
    assertThrows(() => new OsShell(config, ["missing"]), Error, "Unable to load dependencies");
  } finally {
    nullResolveStub.restore();
  }

  const emptyPkg = new FileSystemPackage(config, "empty-pkg", TestHelper.getNewTempDir(), "empty.levain.yaml", "version: 1.0.0\n");
  const loopPkg = new FileSystemPackage(
    config,
    "loop-pkg",
    TestHelper.getNewTempDir(),
    "loop.levain.yaml",
    "version: 1.0.0\ncmd.env:\n  - levainShell echo boom\n",
  );

  const emptyStub = stub(config.packageManager, "resolvePackages", () => [emptyPkg]);
  try {
    const shell = new OsShell(config, ["empty-pkg"]);
    await shell.execute([], false);
  } finally {
    emptyStub.restore();
  }

  const loopStub = stub(config.packageManager, "resolvePackages", () => [loopPkg]);
  try {
    const shell = new OsShell(config, ["loop-pkg"]);
    await assertRejects(() => shell.execute([], false), Error, "levainShell action is not allowed here");
  } finally {
    loopStub.restore();
  }
});

Deno.test("OsShell.prepareShellOptions covers interactive default prompt, missing PATH, and empty versionTag", async () => {
  const config = TestHelper.getConfig();
  config.shellPath = undefined;
  config.packageManager = new PackageManagerMock(config);
  config.context.action = { addpath: { path: ["/custom/bin"] } };

  const osShell = new OsShell(config, ["abc"], true);
  osShell.interactive = true;

  const envStub = stub(Deno.env, "get", (key: string) => (key === "PATH" ? undefined : undefined));
  const verProp = Object.getOwnPropertyDescriptor(LevainVersion, "levainVersion");
  Object.defineProperty(LevainVersion, "levainVersion", { get: () => undefined, configurable: true });
  try {
    assertEquals(osShell.versionTag(), "");
    const opt = await osShell.prepareShellOptions([]);
    assertEquals(opt.cmd, ["cmd", "/c", "start", "cmd", "/k", "prompt", "[%LEVAIN_CURRENT%]", "%_LEVAIN_OLD_PROMPT%"]);
    assert(opt.env["PATH"].includes("/custom/bin"));
  } finally {
    if (verProp) Object.defineProperty(LevainVersion, "levainVersion", verProp);
    envStub.restore();
  }
});

Deno.test("OsShell.openShell and execute handle saveVar, stripCRLF, spawn, and ignoreErrors cross-platform", async () => {
  const config = TestHelper.getConfig();
  config.packageManager = new PackageManagerMock(config);

  const winStub = stub(OsUtils, "onlyInWindows", () => {});
  const OrigCommand = Deno.Command;
  const encoder = new TextEncoder();

  try {
    // 1. saveVar with stripCRLF trims trailing CRLF
    (Deno as { Command: unknown }).Command = class FakeCommand {
      output() {
        return Promise.resolve({ success: true, code: 0, stdout: encoder.encode("hello\r\n"), stderr: new Uint8Array() });
      }
    };
    const shell1 = new OsShell(config, ["abc"], true);
    shell1.saveVar = "OUT_VAR";
    shell1.stripCRLF = true;
    await shell1.execute(["echo", "hello"], true);
    assertEquals(config.getVar("OUT_VAR"), "hello");
    shell1.shellTokens = tokenizeShellArgs("echo hello| cat");
    await shell1.execute(["echo", "hello", "|", "cat"], true);
    assertEquals(config.getVar("OUT_VAR"), "hello");

    // 2. saveVar failure throws with stderr logged when ignoreErrors=false, succeeds when ignoreErrors=true
    (Deno as { Command: unknown }).Command = class FakeCommand {
      output() {
        return Promise.resolve({
          success: false,
          code: 7,
          stdout: encoder.encode("partial\n"),
          stderr: encoder.encode("failure detail"),
        });
      }
    };
    const shell2 = new OsShell(config, ["abc"], true);
    shell2.saveVar = "ERR_VAR";
    await assertRejects(() => shell2.openShell(["bad"]), Error, "CMD terminated with code 7");

    shell2.ignoreErrors = true;
    shell2.stripCRLF = true;
    await shell2.openShell(["bad"]);
    assertEquals(config.getVar("ERR_VAR"), "partial");

    // 3. Non-interactive spawn pipes stdout/stderr into logger (redacting passwords) while interactive uses inherit
    const logger = await TestHelper.setupTestLogger();
    config.password = "TopSecret#9";
    const makeStream = (chunks: string[]) =>
      new ReadableStream<Uint8Array>({
        start(controller) {
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        },
      });

    let spawnSuccess = true;
    (Deno as { Command: unknown }).Command = class FakeCommand {
      spawn() {
        return {
          stdout: makeStream(["first ", "line\r\npass=TopSecret#9\ntrailing"]),
          stderr: makeStream(["'yarn' is not recognized\r\n"]),
          status: Promise.resolve({ success: spawnSuccess, code: spawnSuccess ? 0 : 9 }),
        };
      }
    };
    const shell3 = new OsShell(config, ["abc"], true);
    const nonInteractiveOpt = await shell3.prepareShellOptions(["yarn", "--version"]);
    assertEquals(nonInteractiveOpt.stdout, "piped");
    assertEquals(nonInteractiveOpt.stderr, "piped");
    assertEquals(nonInteractiveOpt.stdin, "inherit");

    await shell3.openShell(["ok"]);
    assert(logger.messages.some((m) => m === "INFO first line"));
    assert(logger.messages.some((m) => m === "INFO pass=******"));
    assert(logger.messages.some((m) => m === "INFO trailing"));
    assert(logger.messages.some((m) => m === "ERROR 'yarn' is not recognized"));
    assertEquals(logger.messages.some((m) => m.includes("TopSecret#9")), false);

    spawnSuccess = false;
    await assertRejects(() => shell3.openShell(["fail"]), Error, "CMD terminated with code 9");

    shell3.ignoreErrors = true;
    await shell3.openShell(["fail"]);

    // 4. Interactive shell keeps inherit stdio and does not read piped streams
    const interactiveShell = new OsShell(config, ["abc"], true);
    interactiveShell.interactive = true;
    const interactiveOpt = await interactiveShell.prepareShellOptions([]);
    assertEquals(interactiveOpt.stdout, "inherit");
    assertEquals(interactiveOpt.stderr, "inherit");
    assertEquals(interactiveOpt.stdin, "inherit");
    (Deno as { Command: unknown }).Command = class FakeCommand {
      spawn() {
        return {
          get stdout() {
            throw new TypeError("stdout is not piped");
          },
          get stderr() {
            throw new TypeError("stderr is not piped");
          },
          status: Promise.resolve({ success: true, code: 0 }),
        };
      }
    };
    await interactiveShell.openShell([]);

    // Undefined stream is a safe no-op
    await OsShell.streamToLog(undefined, () => {}, config);

    // 5. Background daemon keeping stdout/stderr pipes open must not hang openShell after process exits
    const prevDrainMs = OsShell.streamDrainAfterExitMs;
    OsShell.streamDrainAfterExitMs = 20;
    let stdoutCancelled = false;
    let stderrCancelled = false;
    try {
      (Deno as { Command: unknown }).Command = class FakeDaemonCommand {
        spawn() {
          return {
            stdout: new ReadableStream<Uint8Array>({
              start(controller) {
                controller.enqueue(encoder.encode("daemon started\r\npartial-tail"));
                // Intentionally never closed (simulates detached background child holding pipe)
              },
              cancel() {
                stdoutCancelled = true;
              },
            }),
            stderr: new ReadableStream<Uint8Array>({
              start() {
                // Intentionally open with no data
              },
              cancel() {
                stderrCancelled = true;
              },
            }),
            status: Promise.resolve({ success: true, code: 0 }),
          };
        }
      };

      const daemonShell = new OsShell(config, ["abc"], true);
      await daemonShell.openShell(["start-daemon.cmd"]);
      assertEquals(stdoutCancelled, true);
      assertEquals(stderrCancelled, true);
      assert(logger.messages.some((m) => m === "INFO daemon started"));
      assert(logger.messages.some((m) => m === "INFO partial-tail"));

      // Pre-aborted signal cancels immediately without hanging
      const preAborted = new AbortController();
      preAborted.abort();
      let preCancelled = false;
      const openStream = new ReadableStream<Uint8Array>({
        start() {},
        cancel() {
          preCancelled = true;
        },
      });
      await OsShell.streamToLog(openStream, () => {}, config, preAborted.signal);
      assertEquals(preCancelled, true);

      // Read error while aborted (e.g. pipe closed on Windows) is ignored and buffered text is flushed
      const abortErrCtrl = new AbortController();
      const abortErrLines: string[] = [];
      let pulledOnce = false;
      const abortErrStream = new ReadableStream<Uint8Array>({
        pull(controller) {
          if (!pulledOnce) {
            pulledOnce = true;
            controller.enqueue(encoder.encode("buffered-before-cancel"));
            return;
          }
          abortErrCtrl.abort();
          controller.error(new Deno.errors.Interrupted("pipe closed"));
        },
      });
      await OsShell.streamToLog(abortErrStream, (line) => abortErrLines.push(line), config, abortErrCtrl.signal);
      assertEquals(abortErrLines, ["buffered-before-cancel"]);

      // Unexpected read error without abort must still propagate
      const unexpectedErrStream = new ReadableStream<Uint8Array>({
        pull(controller) {
          controller.error(new Error("unexpected stream failure"));
        },
      });
      await assertRejects(
        () => OsShell.streamToLog(unexpectedErrStream, () => {}, config),
        Error,
        "unexpected stream failure",
      );
    } finally {
      OsShell.streamDrainAfterExitMs = prevDrainMs;
    }
  } finally {
    (Deno as { Command: unknown }).Command = OrigCommand;
    winStub.restore();
  }
});
