import { assert, assertEquals, assertRejects, assertStringIncludes, assertThrows } from "@std/assert";
import * as path from "@std/path";
import { stub } from "@std/testing/mock";
import {
  buildRemoteCleanupCommand,
  buildRemoteCmdScript,
  buildScpArgs,
  buildSshArgs,
  CONTRACT_DOCS,
  createDefaultDeps,
  defaultCreateWorkspaceArchive,
  defaultRunCommand,
  filterArchivePaths,
  formatSkipMessage,
  main,
  parseArgs,
  quoteCmdArg,
  resolveWindowsSshContract,
  RunnerDeps,
  runWindowsTests,
  SSH_CONFIG_ENV,
  SSH_HOST_ENV,
} from "./run-windows-tests.ts";

function createCapturedLogger() {
  const logs: string[] = [];
  const errors: string[] = [];
  return {
    logs,
    errors,
    logger: {
      log: (...args: unknown[]) => logs.push(args.map(String).join(" ")),
      error: (...args: unknown[]) => errors.push(args.map(String).join(" ")),
    },
  };
}

Deno.test("run-windows-tests - parseArgs", async (t) => {
  await t.step("parses defaults", () => {
    const opts = parseArgs([]);
    assertEquals(opts.local, false);
    assertEquals(opts.checkOnly, false);
    assertEquals(opts.keepRemote, false);
    assertEquals(opts.denoVersion, "2.9.8");
    assertEquals(opts.denoTestArgs, []);
  });

  await t.step("parses runner flags and forwards remaining args after --", () => {
    const opts = parseArgs([
      "--deno-version",
      "2.9.6",
      "--keep-remote",
      "--",
      "--filter",
      "Registry",
    ]);
    assertEquals(opts.denoVersion, "2.9.6");
    assertEquals(opts.keepRemote, true);
    assertEquals(opts.denoTestArgs, ["--filter", "Registry"]);
  });

  await t.step("supports --local, --check-only and --deno-version=X.Y.Z", () => {
    const opts = parseArgs(["--local", "--check-only", "--deno-version=2.10.0"]);
    assertEquals(opts.local, true);
    assertEquals(opts.checkOnly, true);
    assertEquals(opts.denoVersion, "2.10.0");
  });

  await t.step("rejects invalid --deno-version", () => {
    assertThrows(() => parseArgs(["--deno-version", "latest"]), Error, "Invalid --deno-version");
    assertThrows(() => parseArgs(["--deno-version"]), Error, "Missing value for --deno-version");
  });
});

Deno.test("run-windows-tests - resolveWindowsSshContract", async (t) => {
  await t.step("reports both variables missing when unset", () => {
    const res = resolveWindowsSshContract(() => undefined, () => true);
    assertEquals(res.ok, false);
    if (!res.ok) {
      assertEquals(res.missing, [SSH_CONFIG_ENV, SSH_HOST_ENV]);
      const msg = formatSkipMessage(res);
      assertStringIncludes(msg, SSH_CONFIG_ENV);
      assertStringIncludes(msg, SSH_HOST_ENV);
      assertStringIncludes(msg, CONTRACT_DOCS);
    }
  });

  await t.step("reports missing LEVAIN_TEST_HOST when only SSH config is set", () => {
    const env: Record<string, string> = { [SSH_CONFIG_ENV]: "/tmp/ssh_config" };
    const res = resolveWindowsSshContract((k) => env[k], () => true);
    assertEquals(res.ok, false);
    if (!res.ok) {
      assertEquals(res.missing, [SSH_HOST_ENV]);
    }
  });

  await t.step("reports unreadable config file when path does not exist", () => {
    const env: Record<string, string> = {
      [SSH_CONFIG_ENV]: "/nonexistent/ssh_config",
      [SSH_HOST_ENV]: "win-test",
    };
    const res = resolveWindowsSshContract((k) => env[k], () => false);
    assertEquals(res.ok, false);
    if (!res.ok) {
      assertStringIncludes(res.reason, SSH_CONFIG_ENV);
    }
  });

  await t.step("succeeds when both env vars are set and ssh_config exists", () => {
    const env: Record<string, string> = {
      [SSH_CONFIG_ENV]: "/path/to/ssh_config",
      [SSH_HOST_ENV]: "win-test",
    };
    const res = resolveWindowsSshContract((k) => env[k], (p) => p === "/path/to/ssh_config");
    assertEquals(res, {
      ok: true,
      contract: { sshConfig: "/path/to/ssh_config", host: "win-test" },
    });
  });

  await t.step("rejects invalid SSH host alias starting with dash or containing whitespace", () => {
    const dashEnv: Record<string, string> = {
      [SSH_CONFIG_ENV]: "/path/to/ssh_config",
      [SSH_HOST_ENV]: "-oProxyCommand=evil",
    };
    const dashRes = resolveWindowsSshContract((k) => dashEnv[k], () => true);
    assertEquals(dashRes.ok, false);
    if (!dashRes.ok) {
      assertStringIncludes(dashRes.reason, SSH_HOST_ENV);
    }

    const spaceEnv: Record<string, string> = {
      [SSH_CONFIG_ENV]: "/path/to/ssh_config",
      [SSH_HOST_ENV]: "win host",
    };
    const spaceRes = resolveWindowsSshContract((k) => spaceEnv[k], () => true);
    assertEquals(spaceRes.ok, false);

    const slashEnv: Record<string, string> = {
      [SSH_CONFIG_ENV]: "/path/to/ssh_config",
      [SSH_HOST_ENV]: "win/host",
    };
    const slashRes = resolveWindowsSshContract((k) => slashEnv[k], () => true);
    assertEquals(slashRes.ok, false);
  });
});

Deno.test("run-windows-tests - command builders follow the ssh -F contract strictly", () => {
  const contract = { sshConfig: "/cfg/ssh_config", host: "win-host" };
  assertEquals(buildSshArgs(contract, "cmd /c run.cmd"), ["-F", "/cfg/ssh_config", "--", "win-host", "cmd /c run.cmd"]);
  assertEquals(buildScpArgs(contract, "/tmp/a.tar.gz", "a.tar.gz"), [
    "-F",
    "/cfg/ssh_config",
    "--",
    "/tmp/a.tar.gz",
    "win-host:a.tar.gz",
  ]);
  assertThrows(
    () => buildSshArgs({ sshConfig: "/cfg/ssh_config", host: "-oProxyCommand=x" }, "cmd"),
    Error,
    "Invalid SSH host alias",
  );
  assertThrows(
    () => buildScpArgs({ sshConfig: "/cfg/ssh_config", host: "-oProxyCommand=x" }, "a", "b"),
    Error,
    "Invalid SSH host alias",
  );

  assertEquals(quoteCmdArg("--filter"), "--filter");
  assertEquals(quoteCmdArg("should show a text"), '"should show a text"');
  assertThrows(() => quoteCmdArg('bad"arg'), Error, "Unsafe character");
  assertThrows(() => quoteCmdArg("%TEMP%"), Error, "Unsafe character");
  assertThrows(() => quoteCmdArg("line1\nline2"), Error, "Unsafe character");
  assertThrows(() => quoteCmdArg("line1\rline2"), Error, "Unsafe character");
  assertThrows(() => quoteCmdArg("foo bar\\"), Error, "Unsafe trailing backslash");

  const script = buildRemoteCmdScript({
    remoteDir: "levain-test-123",
    remoteArchive: "levain-test-123.tar.gz",
    denoVersion: "2.9.8",
    checkOnly: false,
    denoTestArgs: ["--filter", "Registry"],
  });
  assertStringIncludes(script, "setlocal DisableDelayedExpansion");
  assertStringIncludes(script, 'mkdir "levain-test-123"');
  assertStringIncludes(script, 'tar -xzf "levain-test-123.tar.gz" -C "levain-test-123"');
  assertStringIncludes(script, "call scripts\\devLevain.cmd 2.9.8");
  assertStringIncludes(script, "bin\\deno.exe test --allow-all --parallel --filter Registry");

  const cleanup = buildRemoteCleanupCommand("levain-test-123", "levain-test-123.tar.gz", "levain-test-123.cmd");
  assertStringIncludes(cleanup, 'rmdir /s /q "levain-test-123"');
  assertStringIncludes(cleanup, 'del /f /q "levain-test-123.tar.gz"');
  assertStringIncludes(cleanup, 'del /f /q "levain-test-123.cmd"');
});

Deno.test("run-windows-tests - filterArchivePaths excludes local build artifacts", () => {
  const files = filterArchivePaths(
    ["levain.ts", "bin/deno.exe", "extra-bin/windows/git/git.exe", "target/levain.exe", "src/cmd/clean.ts", ""],
    (p) => p !== "missing.ts",
  );
  assertEquals(files, ["levain.ts", "src/cmd/clean.ts"]);
});

Deno.test("run-windows-tests - runWindowsTests orchestration", async (t) => {
  await t.step("skips cleanly (exit 0) without invoking ssh/scp when contract vars are missing", async () => {
    const captured = createCapturedLogger();
    const calls: string[][] = [];
    const deps: RunnerDeps = {
      getEnv: () => undefined,
      fileExists: () => false,
      os: "linux",
      runCommand: (cmd, args) => {
        calls.push([cmd, ...args]);
        return Promise.resolve({ code: 0, stdout: "", stderr: "" });
      },
      createWorkspaceArchive: () => Promise.resolve(),
      makeTempDir: () => "/tmp/unused",
      writeTextFile: () => {},
      removePath: () => {},
      generateRunId: () => "20260101000000",
      logger: captured.logger,
    };

    const res = await runWindowsTests(parseArgs([]), deps);
    assertEquals(res, { status: "skipped", exitCode: 0 });
    assertEquals(calls, []);
    assertStringIncludes(captured.logs.join("\n"), "SKIP:");
    assertStringIncludes(captured.logs.join("\n"), CONTRACT_DOCS);
  });

  await t.step("runs scp -F, ssh -F and cleanup when contract is configured", async () => {
    const captured = createCapturedLogger();
    const calls: string[][] = [];
    const removed: string[] = [];
    const env: Record<string, string> = {
      [SSH_CONFIG_ENV]: "/cfg/win_ssh",
      [SSH_HOST_ENV]: "win-box",
    };

    const deps: RunnerDeps = {
      getEnv: (k) => env[k],
      fileExists: (p) => p === "/cfg/win_ssh",
      os: "linux",
      runCommand: (cmd, args) => {
        calls.push([cmd, ...args]);
        return Promise.resolve({ code: 0, stdout: "", stderr: "" });
      },
      createWorkspaceArchive: () => Promise.resolve(),
      makeTempDir: () => "/tmp/run-dir",
      writeTextFile: () => {},
      removePath: (p) => removed.push(p),
      generateRunId: () => "20261121220000",
      logger: captured.logger,
    };

    const res = await runWindowsTests(parseArgs(["--", "--filter", "Registry"]), deps);
    assertEquals(res, { status: "passed", exitCode: 0 });
    assertEquals(calls.length, 4);
    assertEquals(calls[0], [
      "scp",
      "-F",
      "/cfg/win_ssh",
      "--",
      path.join("/tmp/run-dir", "levain-test-20261121220000.tar.gz"),
      "win-box:levain-test-20261121220000.tar.gz",
    ]);
    assertEquals(calls[1], [
      "scp",
      "-F",
      "/cfg/win_ssh",
      "--",
      path.join("/tmp/run-dir", "levain-test-20261121220000.cmd"),
      "win-box:levain-test-20261121220000.cmd",
    ]);
    assertEquals(calls[2], ["ssh", "-F", "/cfg/win_ssh", "--", "win-box", 'cmd /c "levain-test-20261121220000.cmd"']);
    assertEquals(calls[3][0], "ssh");
    assertEquals(calls[3][1], "-F");
    assertEquals(calls[3][2], "/cfg/win_ssh");
    assertEquals(calls[3][3], "--");
    assertEquals(calls[3][4], "win-box");
    assertEquals(removed, ["/tmp/run-dir"]);
  });

  await t.step("refuses --local on non-Windows hosts with clear error", async () => {
    const captured = createCapturedLogger();
    const deps: RunnerDeps = {
      getEnv: () => undefined,
      fileExists: () => false,
      os: "linux",
      runCommand: () => Promise.resolve({ code: 0, stdout: "", stderr: "" }),
      createWorkspaceArchive: () => Promise.resolve(),
      makeTempDir: () => "/tmp/unused",
      writeTextFile: () => {},
      removePath: () => {},
      generateRunId: () => "id",
      logger: captured.logger,
    };

    const res = await runWindowsTests(parseArgs(["--local"]), deps);
    assertEquals(res, { status: "failed", exitCode: 1 });
    assertStringIncludes(captured.errors.join("\n"), "--local requires Windows");
  });

  await t.step("runs check, lint, and deno test locally when --local is passed on Windows", async () => {
    const captured = createCapturedLogger();
    const calls: string[][] = [];
    const deps: RunnerDeps = {
      getEnv: () => undefined,
      fileExists: () => false,
      os: "windows",
      runCommand: (_cmd, args) => {
        calls.push(args);
        return Promise.resolve({ code: 0, stdout: "", stderr: "" });
      },
      createWorkspaceArchive: () => Promise.resolve(),
      makeTempDir: () => "/tmp/unused",
      writeTextFile: () => {},
      removePath: () => {},
      generateRunId: () => "id",
      logger: captured.logger,
    };

    const res = await runWindowsTests(parseArgs(["--local", "--", "--filter", "Registry"]), deps);
    assertEquals(res, { status: "passed", exitCode: 0 });
    assertEquals(calls, [
      ["check", "levain.ts"],
      ["lint"],
      ["test", "--allow-all", "--parallel", "--filter", "Registry"],
    ]);
  });

  await t.step("propagates scp/ssh/local failures and honors --keep-remote", async () => {
    const env: Record<string, string> = {
      [SSH_CONFIG_ENV]: "/cfg/win_ssh",
      [SSH_HOST_ENV]: "win-box",
    };
    const makeRemoteDeps = (failAtCall: number) => {
      let call = 0;
      const captured = createCapturedLogger();
      const cmds: string[] = [];
      const deps: RunnerDeps = {
        getEnv: (k) => env[k],
        fileExists: (p) => p === "/cfg/win_ssh",
        os: "linux",
        runCommand: (cmd) => {
          call++;
          cmds.push(cmd);
          return Promise.resolve({ code: call === failAtCall ? 2 : 0, stdout: "", stderr: "" });
        },
        createWorkspaceArchive: () => Promise.resolve(),
        makeTempDir: () => "/tmp/run-dir",
        writeTextFile: () => {},
        removePath: () => {},
        generateRunId: () => "id1",
        logger: captured.logger,
      };
      return { deps, cmds, captured };
    };

    // Pass extra arg without '--'
    assertEquals(parseArgs(["--filter", "Foo"]).denoTestArgs, ["--filter", "Foo"]);

    // 1st scp fails
    assertEquals((await runWindowsTests(parseArgs([]), makeRemoteDeps(1).deps)).status, "failed");
    // 2nd scp fails
    assertEquals((await runWindowsTests(parseArgs([]), makeRemoteDeps(2).deps)).status, "failed");
    // ssh execution fails
    assertEquals((await runWindowsTests(parseArgs([]), makeRemoteDeps(3).deps)).status, "failed");
    // --keep-remote skips cleanup ssh call (only 3 calls instead of 4)
    const kept = makeRemoteDeps(99);
    const keepRes = await runWindowsTests(parseArgs(["--keep-remote"]), kept.deps);
    assertEquals(keepRes, { status: "passed", exitCode: 0 });
    assertEquals(kept.cmds.length, 3);
    assertStringIncludes(kept.captured.logs.join("\n"), "Keeping remote working directory");

    // Local failures at check, lint, and test
    for (const failStep of [1, 2, 3]) {
      let n = 0;
      const localDeps: RunnerDeps = {
        getEnv: () => undefined,
        fileExists: () => false,
        os: "windows",
        runCommand: () => Promise.resolve({ code: ++n === failStep ? 1 : 0, stdout: "", stderr: "" }),
        createWorkspaceArchive: () => Promise.resolve(),
        makeTempDir: () => "/tmp/x",
        writeTextFile: () => {},
        removePath: () => {},
        generateRunId: () => "id",
        logger: createCapturedLogger().logger,
      };
      assertEquals((await runWindowsTests(parseArgs(["--local"]), localDeps)).status, "failed");
    }
  });
});

Deno.test("run-windows-tests - defaultRunCommand, defaultCreateWorkspaceArchive, createDefaultDeps, and main", async () => {
  const encoder = new TextEncoder();
  const OrigCommand = Deno.Command;
  const logStub = stub(console, "log", () => {});
  try {
    // defaultRunCommand piped & inherit
    (Deno as { Command: unknown }).Command = class FakeCommand {
      output() {
        return Promise.resolve({ code: 0, stdout: encoder.encode("out"), stderr: encoder.encode("err") });
      }
    };
    assertEquals(await defaultRunCommand("echo", ["hi"], false), { code: 0, stdout: "out", stderr: "err" });
    assertEquals(await defaultRunCommand("echo", ["hi"], true), { code: 0, stdout: "", stderr: "" });

    // defaultCreateWorkspaceArchive success
    const deps = createDefaultDeps();
    const tmpDir = deps.makeTempDir();
    const archivePath = path.join(tmpDir, "ws.tar.gz");
    deps.writeTextFile(path.join(tmpDir, "probe.txt"), "ok");
    assert(deps.fileExists(path.join(tmpDir, "probe.txt")));
    assertEquals(deps.generateRunId().length, 14);
    assertEquals(typeof deps.getEnv("PATH"), "string");

    let cmdIdx = 0;
    (Deno as { Command: unknown }).Command = class FakeCommand {
      output() {
        cmdIdx++;
        if (cmdIdx === 1) {
          return Promise.resolve({ code: 0, stdout: encoder.encode("levain.ts\0"), stderr: new Uint8Array() });
        }
        return Promise.resolve({ code: 0, stdout: new Uint8Array(), stderr: new Uint8Array() });
      }
    };
    await defaultCreateWorkspaceArchive(archivePath);

    // defaultCreateWorkspaceArchive error cases: git fails, empty files, tar fails
    (Deno as { Command: unknown }).Command = class FakeCommand {
      output() {
        return Promise.resolve({ code: 1, stdout: new Uint8Array(), stderr: encoder.encode("git err") });
      }
    };
    await assertRejects(() => defaultCreateWorkspaceArchive(archivePath), Error, "git ls-files");

    (Deno as { Command: unknown }).Command = class FakeCommand {
      output() {
        return Promise.resolve({ code: 0, stdout: encoder.encode(""), stderr: new Uint8Array() });
      }
    };
    await assertRejects(() => defaultCreateWorkspaceArchive(archivePath), Error, "No workspace files");

    cmdIdx = 0;
    (Deno as { Command: unknown }).Command = class FakeCommand {
      output() {
        cmdIdx++;
        if (cmdIdx === 1) {
          return Promise.resolve({ code: 0, stdout: encoder.encode("levain.ts\0"), stderr: new Uint8Array() });
        }
        return Promise.resolve({ code: 1, stdout: new Uint8Array(), stderr: encoder.encode("tar err") });
      }
    };
    await assertRejects(() => defaultCreateWorkspaceArchive(archivePath), Error, "via tar");

    deps.removePath(tmpDir);
    // removePath ignores missing paths
    deps.removePath(path.join(tmpDir, "already-gone"));

    // main() with unset SSH env skips cleanly with exit 0
    const argsProp = Object.getOwnPropertyDescriptor(Deno, "args");
    const envStub = stub(Deno.env, "get", () => undefined);
    const exitCodes: number[] = [];
    const exitStub = stub(Deno, "exit", (code?: number): never => {
      exitCodes.push(code ?? 0);
      return undefined as never;
    });
    try {
      Object.defineProperty(Deno, "args", { value: [], configurable: true });
      await main();
      assertEquals(exitCodes, [0]);
    } finally {
      exitStub.restore();
      envStub.restore();
      if (argsProp) Object.defineProperty(Deno, "args", argsProp);
    }
  } finally {
    (Deno as { Command: unknown }).Command = OrigCommand;
    logStub.restore();
  }
});
