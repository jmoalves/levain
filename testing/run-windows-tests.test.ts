import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import * as path from "@std/path";
import {
  buildRemoteCleanupCommand,
  buildRemoteCmdScript,
  buildScpArgs,
  buildSshArgs,
  CONTRACT_DOCS,
  filterArchivePaths,
  formatSkipMessage,
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
});

Deno.test("run-windows-tests - command builders follow the ssh -F contract strictly", () => {
  const contract = { sshConfig: "/cfg/ssh_config", host: "win-host" };
  assertEquals(buildSshArgs(contract, "cmd /c run.cmd"), ["-F", "/cfg/ssh_config", "win-host", "cmd /c run.cmd"]);
  assertEquals(buildScpArgs(contract, "/tmp/a.tar.gz", "a.tar.gz"), [
    "-F",
    "/cfg/ssh_config",
    "/tmp/a.tar.gz",
    "win-host:a.tar.gz",
  ]);
  assertEquals(quoteCmdArg("--filter"), "--filter");
  assertEquals(quoteCmdArg("should show a text"), '"should show a text"');

  const script = buildRemoteCmdScript({
    remoteDir: "levain-test-123",
    remoteArchive: "levain-test-123.tar.gz",
    denoVersion: "2.9.8",
    checkOnly: false,
    denoTestArgs: ["--filter", "Registry"],
  });
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
      path.join("/tmp/run-dir", "levain-test-20261121220000.tar.gz"),
      "win-box:levain-test-20261121220000.tar.gz",
    ]);
    assertEquals(calls[1], [
      "scp",
      "-F",
      "/cfg/win_ssh",
      path.join("/tmp/run-dir", "levain-test-20261121220000.cmd"),
      "win-box:levain-test-20261121220000.cmd",
    ]);
    assertEquals(calls[2], ["ssh", "-F", "/cfg/win_ssh", "win-box", 'cmd /c "levain-test-20261121220000.cmd"']);
    assertEquals(calls[3][0], "ssh");
    assertEquals(calls[3][1], "-F");
    assertEquals(calls[3][2], "/cfg/win_ssh");
    assertEquals(calls[3][3], "win-box");
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
});
