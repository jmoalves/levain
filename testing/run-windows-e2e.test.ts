import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import * as path from "@std/path";
import { stub } from "@std/testing/mock";
import {
  assertSafeRepo,
  buildReleaseInstallPsCommand,
  buildRemoteE2eCleanupCommand,
  buildRemoteE2eCmdScript,
  BUILTIN_VERIFY_SCRIPT,
  DEFAULT_E2E_PACKAGES,
  DEFAULT_E2E_PACKAGES_FILE,
  DEFAULT_E2E_REPO,
  DEFAULT_E2E_REPOSITORY,
  GET_DENO_CMD,
  main,
  parseE2eArgs,
  parsePackagesFileContent,
  runWindowsE2e,
} from "./run-windows-e2e.ts";
import { CONTRACT_DOCS, type RunnerDeps, SSH_CONFIG_ENV, SSH_HOST_ENV } from "./run-windows-tests.ts";

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

Deno.test("run-windows-e2e - parseE2eArgs", async (t) => {
  await t.step("parses defaults", () => {
    const opts = parseE2eArgs([]);
    assertEquals(opts.local, false);
    assertEquals(opts.fromSource, true);
    assertEquals(opts.levainVersion, undefined);
    assertEquals(opts.repository, DEFAULT_E2E_REPOSITORY);
    assertEquals(opts.repos, [DEFAULT_E2E_REPO]);
    assertEquals(opts.packages, DEFAULT_E2E_PACKAGES);
    assertEquals(opts.verifyScript, undefined);
    assertEquals(opts.denoVersion, "2.9.8");
    assertEquals(opts.keepRemote, false);
    assertEquals(opts.testConcurrency, true);
  });

  await t.step("parses space-separated and equals flags including repeatable --repo and --packages", () => {
    const opts = parseE2eArgs([
      "--levain-version",
      "1.1.0",
      "--repository=owner/levain",
      "--repo",
      "https://example.org/base-pkgs.git",
      "--repo=https://example.org/extra-pkgs.git",
      "--packages",
      "git,jdk-21",
      "--packages=maven",
      "--verify",
      "/tmp/custom-verify.ts",
      "--deno-version=2.9.9",
      "--keep-remote",
      "--skip-concurrency",
      "--local",
    ]);
    assertEquals(opts.local, true);
    assertEquals(opts.fromSource, false);
    assertEquals(opts.levainVersion, "1.1.0");
    assertEquals(opts.repository, "owner/levain");
    assertEquals(opts.repos, [
      "https://example.org/base-pkgs.git",
      "https://example.org/extra-pkgs.git",
    ]);
    assertEquals(opts.packages, ["git", "jdk-21", "maven"]);
    assertEquals(opts.verifyScript, "/tmp/custom-verify.ts");
    assertEquals(opts.denoVersion, "2.9.9");
    assertEquals(opts.keepRemote, true);
    assertEquals(opts.testConcurrency, false);
  });

  await t.step("supports --from-source, --levain-version=, --repository, --verify=, and --deno-version", () => {
    const srcOpts = parseE2eArgs([
      "--from-source",
      "--repository",
      "org/levain",
      "--verify=/tmp/v.ts",
      "--deno-version",
      "2.10.0",
    ]);
    assertEquals(srcOpts.fromSource, true);
    assertEquals(srcOpts.repository, "org/levain");
    assertEquals(srcOpts.verifyScript, "/tmp/v.ts");
    assertEquals(srcOpts.denoVersion, "2.10.0");

    const verOpts = parseE2eArgs(["--levain-version=1.2.3"]);
    assertEquals(verOpts.fromSource, false);
    assertEquals(verOpts.levainVersion, "1.2.3");
  });

  await t.step("rejects invalid flags, missing values, leading dashes, unsafe chars, smart quotes, and conflicts", () => {
    assertThrows(() => parseE2eArgs(["--unknown"]), Error, "Unknown option");
    assertThrows(() => parseE2eArgs(["--from-source", "--levain-version", "1.1.0"]), Error, "Cannot combine");
    assertThrows(() => parseE2eArgs(["--levain-version", "latest"]), Error, "Invalid --levain-version");
    assertThrows(() => parseE2eArgs(["--levain-version"]), Error, "Missing value");
    assertThrows(() => parseE2eArgs(["--levain-version="]), Error, "Missing or invalid value");
    assertThrows(() => parseE2eArgs(["--repo=--injected"]), Error, "Missing or invalid value");
    assertThrows(() => parseE2eArgs(["--verify=--flag"]), Error, "Missing or invalid value");
    assertThrows(() => parseE2eArgs(["--repo", "bad%url"]), Error, "Unsafe character");
    assertThrows(() => assertSafeRepo("https://example.org/a&b.git"), Error, "Unsafe character");
    assertThrows(() => assertSafeRepo("https://example.org/a\u2019b.git"), Error, "Unsafe character");
    assertThrows(() => parseE2eArgs(["--repository", "not-a-repo"]), Error, "Invalid --repository");
    assertThrows(() => parseE2eArgs(["--deno-version", "bad"]), Error, "Invalid --deno-version");
    assertThrows(() => parseE2eArgs(["--packages", "git;whoami"]), Error, "Invalid package name");
  });

  await t.step("parses --packages-file (comments, commas, whitespace) and keeps default-packages.txt in sync", () => {
    assertEquals(
      parsePackagesFileContent("# header\n\ngit # inline comment\njdk-21, maven\r\n  deno  \n"),
      ["git", "jdk-21", "maven", "deno"],
    );

    // Ensure testing/e2e/default-packages.txt stays in sync with DEFAULT_E2E_PACKAGES
    const fromDefaultFile = parseE2eArgs(["--packages-file", DEFAULT_E2E_PACKAGES_FILE]);
    assertEquals(fromDefaultFile.packages, DEFAULT_E2E_PACKAGES);

    const files: Record<string, string> = {
      "/tmp/a.txt": "# curated list\ngit\njdk-21-ibm-latest\n",
      "/tmp/b.txt": "maven-latest, vscode # editor\n",
      "/tmp/empty.txt": "# only comments\n   \n",
      "/tmp/bad.txt": "bad;pkg\n",
    };
    const fakeRead = (p: string) => {
      if (!(p in files)) throw new Error("ENOENT");
      return files[p];
    };

    const combined = parseE2eArgs(
      ["--packages-file", "/tmp/a.txt", "--packages-file=/tmp/b.txt", "--packages", "jq,notepad++"],
      "2.9.8",
      fakeRead,
    );
    assertEquals(combined.packages, ["git", "jdk-21-ibm-latest", "maven-latest", "vscode", "jq", "notepad++"]);

    assertThrows(() => parseE2eArgs(["--packages-file", "/tmp/missing.txt"], "2.9.8", fakeRead), Error, "Could not read");
    assertThrows(() => parseE2eArgs(["--packages-file", "/tmp/empty.txt"], "2.9.8", fakeRead), Error, "No packages found");
    assertThrows(() => parseE2eArgs(["--packages-file", "/tmp/bad.txt"], "2.9.8", fakeRead), Error, "Invalid package name");
    assertThrows(() => parseE2eArgs(["--packages-file"], "2.9.8", fakeRead), Error, "Missing value");
    assertThrows(
      () =>
        parseE2eArgs(["--packages-file", "/tmp/err.txt"], "2.9.8", () => {
          throw "non-error";
        }),
      Error,
      "non-error",
    );
  });
});

Deno.test("run-windows-e2e - script and cleanup builders", () => {
  const psInstall = buildReleaseInstallPsCommand();
  assertStringIncludes(psInstall, "Tls12");
  assertStringIncludes(psInstall, "$env:E2E_LEVAIN_REPO");
  assertStringIncludes(psInstall, "Invoke-WebRequest -Uri $env:E2E_INSTALL_URL -OutFile $tmpScript");

  const fromSourceScript = buildRemoteE2eCmdScript({
    remoteDir: "levain-e2e-123",
    remoteArchive: "levain-e2e-123.tar.gz",
    remoteVerifyScript: "levain-e2e-123-verify.ts",
    remoteCustomVerifyScript: "levain-e2e-123-custom-verify.ts",
    opts: parseE2eArgs([
      "--from-source",
      "--repo",
      "https://example.org/pkgs.git?ref=main",
      "--packages",
      "git,maven",
      "--skip-concurrency",
    ]),
  });
  assertStringIncludes(fromSourceScript, "setlocal DisableDelayedExpansion");
  assertStringIncludes(fromSourceScript, 'tar -xzf "..\\levain-e2e-123.tar.gz" -C "."');
  assertStringIncludes(fromSourceScript, "call scripts\\devLevain.cmd 2.9.8");
  assertStringIncludes(fromSourceScript, "call scripts\\levain-build.cmd target");
  assertStringIncludes(fromSourceScript, '--addRepo "https://example.org/pkgs.git?ref=main"');
  assertStringIncludes(fromSourceScript, "install git maven");
  assertStringIncludes(fromSourceScript, 'bin\\deno.exe run --allow-all "testing\\e2e\\verify-e2e.ts"');
  assertStringIncludes(fromSourceScript, "--skip-concurrency");
  assertStringIncludes(fromSourceScript, 'bin\\deno.exe run --allow-all "..\\levain-e2e-123-custom-verify.ts"');

  const releaseScript = buildRemoteE2eCmdScript({
    remoteDir: "levain-e2e-456",
    remoteVerifyScript: "levain-e2e-456-verify.ts",
    remoteGetDenoScript: "levain-e2e-456-get-deno.cmd",
    opts: parseE2eArgs([
      "--levain-version",
      "1.1.0",
      "--repo",
      "https://example.org/base.git",
      "--repo",
      "https://example.org/extra.git",
      "--packages",
      "git",
    ]),
  });
  assertStringIncludes(releaseScript, 'set "E2E_LEVAIN_VERSION=1.1.0"');
  assertStringIncludes(releaseScript, 'set "E2E_LEVAIN_REPO=https://example.org/base.git"');
  assertStringIncludes(releaseScript, "releases/download/v1.1.0/install.ps1");
  assertStringIncludes(releaseScript, "--addRepo https://example.org/extra.git");
  assertStringIncludes(releaseScript, 'call "..\\levain-e2e-456-get-deno.cmd" "%CD%\\bin" 2.9.8');
  assertStringIncludes(releaseScript, 'bin\\deno.exe run --allow-all "..\\levain-e2e-456-verify.ts"');
  assertStringIncludes(releaseScript, "--expected-version 1.1.0");

  const cleanup = buildRemoteE2eCleanupCommand(["a.cmd", "b.ts"], "levain-e2e-456");
  assertStringIncludes(cleanup, 'rmdir /s /q "levain-e2e-456"');
  assertStringIncludes(cleanup, 'del /f /q "a.cmd"');
  assertStringIncludes(cleanup, 'del /f /q "b.ts"');
});

Deno.test("run-windows-e2e - runWindowsE2e orchestration", async (t) => {
  await t.step("fails early if --verify script does not exist", async () => {
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

    const res = await runWindowsE2e(parseE2eArgs(["--verify", "/missing/custom.ts"]), deps);
    assertEquals(res, { status: "failed", exitCode: 1 });
    assertStringIncludes(captured.errors.join("\n"), "--verify script not found");
  });

  await t.step("skips cleanly (exit 0) when SSH contract vars are missing", async () => {
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
      generateRunId: () => "20261126000000",
      logger: captured.logger,
    };

    const res = await runWindowsE2e(parseE2eArgs([]), deps);
    assertEquals(res, { status: "skipped", exitCode: 0 });
    assertEquals(calls, []);
    assertStringIncludes(captured.logs.join("\n"), "SKIP:");
    assertStringIncludes(captured.logs.join("\n"), CONTRACT_DOCS);
  });

  await t.step("runs remote --from-source E2E with scp -F, ssh -F, and cleanup", async () => {
    const captured = createCapturedLogger();
    const calls: string[][] = [];
    const removed: string[] = [];
    const env: Record<string, string> = {
      [SSH_CONFIG_ENV]: "/cfg/ssh_config",
      [SSH_HOST_ENV]: "win-e2e",
    };

    const deps: RunnerDeps = {
      getEnv: (k) => env[k],
      fileExists: (p) => p === "/cfg/ssh_config",
      os: "linux",
      runCommand: (cmd, args) => {
        calls.push([cmd, ...args]);
        return Promise.resolve({ code: 0, stdout: "", stderr: "" });
      },
      createWorkspaceArchive: () => Promise.resolve(),
      makeTempDir: () => "/tmp/e2e-run",
      writeTextFile: () => {},
      removePath: (p) => removed.push(p),
      generateRunId: () => "20261126010101",
      logger: captured.logger,
    };

    const res = await runWindowsE2e(parseE2eArgs(["--packages", "git"]), deps);
    assertEquals(res, { status: "passed", exitCode: 0 });
    assertEquals(calls.length, 4);
    assertEquals(calls[0][0], "scp");
    assertEquals(calls[1][0], "scp");
    assertEquals(calls[2], ["ssh", "-F", "/cfg/ssh_config", "--", "win-e2e", 'cmd /c "levain-e2e-20261126010101.cmd"']);
    assertEquals(calls[3][0], "ssh");
    assertEquals(removed, ["/tmp/e2e-run"]);
  });

  await t.step("runs remote --levain-version with custom --verify and propagates scp/ssh failures and --keep-remote", async () => {
    const env: Record<string, string> = {
      [SSH_CONFIG_ENV]: "/cfg/ssh_config",
      [SSH_HOST_ENV]: "win-e2e",
    };
    const makeRemoteDeps = (failAtCall: number) => {
      let call = 0;
      const calls: string[][] = [];
      const captured = createCapturedLogger();
      const deps: RunnerDeps = {
        getEnv: (k) => env[k],
        fileExists: (p) => p === "/cfg/ssh_config" || p === "/custom/verify.ts",
        os: "linux",
        runCommand: (cmd, args) => {
          call++;
          calls.push([cmd, ...args]);
          return Promise.resolve({ code: call === failAtCall ? 2 : 0, stdout: "", stderr: "" });
        },
        createWorkspaceArchive: () => Promise.resolve(),
        makeTempDir: () => "/tmp/e2e-run",
        writeTextFile: () => {},
        removePath: () => {},
        generateRunId: () => "id2",
        logger: captured.logger,
      };
      return { deps, calls, captured };
    };

    // Release mode + custom verify uploads verify-e2e.ts, get-deno.cmd, custom verify, and cmd script, then runs ssh + cleanup (6 calls)
    const ok = makeRemoteDeps(99);
    const okRes = await runWindowsE2e(
      parseE2eArgs(["--levain-version", "1.1.0", "--verify", "/custom/verify.ts"]),
      ok.deps,
    );
    assertEquals(okRes, { status: "passed", exitCode: 0 });
    assertEquals(ok.calls.length, 6);
    assertEquals(ok.calls[0][4], BUILTIN_VERIFY_SCRIPT);
    assertEquals(ok.calls[1][4], GET_DENO_CMD);
    assertEquals(ok.calls[2][4], "/custom/verify.ts");

    // Failures at each remote step
    for (const failAt of [1, 2, 3, 4, 5]) {
      const failed = makeRemoteDeps(failAt);
      const r = await runWindowsE2e(
        parseE2eArgs(["--levain-version", "1.1.0", "--verify", "/custom/verify.ts"]),
        failed.deps,
      );
      assertEquals(r.status, "failed");
    }

    // --from-source failure on archive upload + --keep-remote skips cleanup
    const failArchive = makeRemoteDeps(1);
    assertEquals((await runWindowsE2e(parseE2eArgs(["--from-source"]), failArchive.deps)).status, "failed");

    const kept = makeRemoteDeps(99);
    const keepRes = await runWindowsE2e(parseE2eArgs(["--from-source", "--keep-remote"]), kept.deps);
    assertEquals(keepRes, { status: "passed", exitCode: 0 });
    assertEquals(kept.calls.length, 3);
    assertStringIncludes(kept.captured.logs.join("\n"), "Keeping remote E2E directory");
  });

  await t.step("handles --local on non-Windows and Windows (both --from-source and --levain-version)", async () => {
    const capturedNonWin = createCapturedLogger();
    const nonWinDeps: RunnerDeps = {
      getEnv: () => undefined,
      fileExists: () => false,
      os: "linux",
      runCommand: () => Promise.resolve({ code: 0, stdout: "", stderr: "" }),
      createWorkspaceArchive: () => Promise.resolve(),
      makeTempDir: () => "/tmp/unused",
      writeTextFile: () => {},
      removePath: () => {},
      generateRunId: () => "id",
      logger: capturedNonWin.logger,
    };
    assertEquals((await runWindowsE2e(parseE2eArgs(["--local"]), nonWinDeps)).status, "failed");
    assertStringIncludes(capturedNonWin.errors.join("\n"), "--local requires Windows");

    const makeWinDeps = (failAtCall: number) => {
      let n = 0;
      const calls: string[][] = [];
      const removed: string[] = [];
      const captured = createCapturedLogger();
      const deps: RunnerDeps = {
        getEnv: () => undefined,
        fileExists: (p) => p === "/custom/v.ts",
        os: "windows",
        runCommand: (cmd, args) => {
          n++;
          calls.push([cmd, ...args]);
          return Promise.resolve({ code: n === failAtCall ? 1 : 0, stdout: "", stderr: "" });
        },
        createWorkspaceArchive: () => Promise.resolve(),
        makeTempDir: () => path.join("C:\\temp", "e2e-local"),
        writeTextFile: () => {},
        removePath: (p) => removed.push(p),
        generateRunId: () => "id",
        logger: captured.logger,
      };
      return { deps, calls, removed, captured };
    };

    // --local --from-source happy path invokes levain.exe directly (6 steps)
    const srcOk = makeWinDeps(99);
    const srcRes = await runWindowsE2e(parseE2eArgs(["--local", "--from-source", "--skip-concurrency"]), srcOk.deps);
    assertEquals(srcRes, { status: "passed", exitCode: 0 });
    assertEquals(srcOk.calls.length, 6);
    assertStringIncludes(srcOk.calls[2][0], "levain.exe");
    assertStringIncludes(srcOk.calls[3][0], "levain.exe");
    assertEquals(srcOk.removed.length, 1);

    // Failures at each step of --local --from-source
    for (const failAt of [1, 2, 3, 4, 5, 6]) {
      assertEquals(
        (await runWindowsE2e(parseE2eArgs(["--local", "--from-source"]), makeWinDeps(failAt).deps)).status,
        "failed",
      );
    }

    // --local --levain-version with multiple repos + custom --verify + --keep-remote + env restore
    Deno.env.set("E2E_LEVAIN_VERSION", "preexisting");
    try {
      const relOk = makeWinDeps(99);
      const relRes = await runWindowsE2e(
        parseE2eArgs([
          "--local",
          "--levain-version",
          "1.1.0",
          "--repo",
          "https://example.org/a.git",
          "--repo",
          "https://example.org/b.git",
          "--verify",
          "/custom/v.ts",
          "--keep-remote",
        ]),
        relOk.deps,
      );
      assertEquals(relRes, { status: "passed", exitCode: 0 });
      assertEquals(relOk.calls.length, 6);
      assertEquals(relOk.removed.length, 0);
      assertEquals(Deno.env.get("E2E_LEVAIN_VERSION"), "preexisting");
      assertStringIncludes(relOk.captured.logs.join("\n"), "Keeping local E2E directory");
    } finally {
      Deno.env.delete("E2E_LEVAIN_VERSION");
    }

    // Failures in --local --levain-version (install.ps1, extra repo list, custom verify)
    for (const failAt of [1, 2, 6]) {
      const r = await runWindowsE2e(
        parseE2eArgs([
          "--local",
          "--levain-version",
          "1.1.0",
          "--repo",
          "https://example.org/a.git",
          "--repo",
          "https://example.org/b.git",
          "--verify",
          "/custom/v.ts",
        ]),
        makeWinDeps(failAt).deps,
      );
      assertEquals(r.status, "failed");
    }
  });
});

Deno.test("run-windows-e2e - main skips cleanly with exit 0 when SSH env is unset", async () => {
  const argsProp = Object.getOwnPropertyDescriptor(Deno, "args");
  const envStub = stub(Deno.env, "get", () => undefined);
  const logStub = stub(console, "log", () => {});
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
    logStub.restore();
    envStub.restore();
    if (argsProp) Object.defineProperty(Deno, "args", argsProp);
  }
});
