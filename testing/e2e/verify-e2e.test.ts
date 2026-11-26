import { assert, assertEquals, assertFalse, assertRejects, assertStringIncludes, assertThrows } from "@std/assert";
import * as path from "node:path";
import { stub } from "@std/testing/mock";
import {
  assertValidPackageName,
  buildBashCheckScript,
  buildCmdCheckScript,
  buildPowerShellCheckScript,
  createDefaultVerifyDeps,
  findGitBashExecutable,
  main,
  parseVerifyArgs,
  runVerification,
  selectActivationPlan,
  type VerifyDeps,
} from "./verify-e2e.ts";

function makeMockDeps(overrides: Partial<VerifyDeps> = {}) {
  const logs: string[] = [];
  const written = new Map<string, string>();
  const removed: string[] = [];
  const runCalls: Array<{ cmd: string; args: string[]; env?: Record<string, string> }> = [];
  let killed = false;

  const deps: VerifyDeps = {
    pathExists: () => true,
    readDirEntries: (dirPath: string) => {
      if (dirPath.endsWith("registry")) {
        return [
          { name: "levain.levain.yaml", isFile: true, isDirectory: false },
          { name: "git.levain.yaml", isFile: true, isDirectory: false },
          { name: "jdk-21.levain.yaml", isFile: true, isDirectory: false },
          { name: "maven.levain.yaml", isFile: true, isDirectory: false },
        ];
      }
      return [{ name: "git", isFile: false, isDirectory: true }];
    },
    makeTempDir: () => "/tmp/e2e-work",
    writeTextFile: (p, c) => {
      written.set(p, c);
    },
    createExclusiveTextFile: (p, c) => {
      written.set(p, c);
    },
    readTextFile: (p) => written.get(p) ?? "",
    mkdirRecursive: () => {},
    removePath: (p) => {
      removed.push(p);
      written.delete(p);
    },
    runProcess: (cmd, args, env) => {
      runCalls.push({ cmd, args, env });
      if (args.includes("--version")) {
        return Promise.resolve({ code: 0, stdout: "levain 1.1.0\n", stderr: "" });
      }
      if (args.includes("actions")) {
        return Promise.resolve({ code: 0, stdout: "copy - Copy files\n", stderr: "" });
      }
      if (args.includes("list")) {
        return Promise.resolve({ code: 0, stdout: "   levain\n   git\n", stderr: "" });
      }
      if (args.includes("info")) {
        return Promise.resolve({ code: 0, stdout: "levain home info\n", stderr: "" });
      }
      if (args.includes("--uninstall")) {
        return Promise.resolve({ code: 0, stdout: "# Uninstall guide\n\n- git\n- levain\n", stderr: "" });
      }
      if (args.includes("explain")) {
        return Promise.resolve({ code: 0, stdout: "# Setup playbook: git\n", stderr: "" });
      }
      if (args.includes("clean")) {
        // Blocked when lock file exists; succeeds otherwise
        const hasLock = [...written.keys()].some((k) => k.endsWith("levain.lock"));
        if (hasLock) {
          return Promise.resolve({ code: 1, stdout: "", stderr: "Another Levain instance (PID 4242) is running" });
        }
        return Promise.resolve({ code: 0, stdout: "cleaned\n", stderr: "" });
      }
      if (cmd === "powershell.exe") {
        return Promise.resolve({ code: 0, stdout: "PS_LEVAIN_CURRENT=git\nPS_JAVA_HOME=C:\\jdk\n", stderr: "" });
      }
      if (cmd === "cmd.exe") {
        return Promise.resolve({ code: 0, stdout: "CMD_LEVAIN_CURRENT=git\nCMD_JAVA_HOME=C:\\jdk\n", stderr: "" });
      }
      return Promise.resolve({ code: 0, stdout: "BASH_LEVAIN_CURRENT=git\n", stderr: "" });
    },
    spawnSleeper: () => ({
      pid: 4242,
      kill: () => {
        killed = true;
      },
    }),
    hostname: () => "test-host",
    generateToken: () => "tok-123",
    logger: { log: (...a: unknown[]) => logs.push(a.map(String).join(" ")) },
    ...overrides,
  };

  return { deps, logs, written, removed, runCalls, wasKilled: () => killed };
}

Deno.test("verify-e2e - parseVerifyArgs and selectActivationPlan", () => {
  const defaults = parseVerifyArgs([], "/custom/home");
  assertEquals(defaults.levainHome, path.resolve("/custom/home"));
  assertEquals(defaults.packages, []);
  assertEquals(defaults.expectedVersion, undefined);
  assertEquals(defaults.skipConcurrency, false);

  const parsed = parseVerifyArgs([
    "--levain-home",
    "/opt/levain",
    "--packages",
    "git,jdk-21",
    "--packages=maven",
    "--expected-version",
    "1.1.0",
    "--skip-concurrency",
  ]);
  assertEquals(parsed.levainHome, path.resolve("/opt/levain"));
  assertEquals(parsed.packages, ["git", "jdk-21", "maven"]);
  assertEquals(parsed.expectedVersion, "1.1.0");
  assertEquals(parsed.skipConcurrency, true);

  const eqParsed = parseVerifyArgs(["--levain-home=/tmp/lh", "--expected-version=2.0.0"]);
  assertEquals(eqParsed.levainHome, path.resolve("/tmp/lh"));
  assertEquals(eqParsed.expectedVersion, "2.0.0");

  assertThrows(() => parseVerifyArgs(["--unknown"]), Error, "Unknown option");
  assertThrows(() => parseVerifyArgs(["--levain-home"]), Error, "Missing value");
  assertThrows(() => parseVerifyArgs(["--levain-home="]), Error, "Missing value");
  assertThrows(() => parseVerifyArgs(["--expected-version", "bad"]), Error, "Invalid --expected-version");
  assertThrows(() => parseVerifyArgs(["--packages", "bad;pkg"]), Error, "Invalid package name");
  assertThrows(() => assertValidPackageName("a b"), Error, "Invalid package name");

  // selectActivationPlan picks git, jdk, maven (excluding git-config) and falls back cleanly
  const fullPlan = selectActivationPlan(["levain", "git-config", "git", "jdk-21", "maven"], []);
  assertEquals(fullPlan, { gitPkg: "git", jdkPkg: "jdk-21", mvnPkg: "maven", activatePkgs: ["git", "jdk-21", "maven"] });

  const requestedPlan = selectActivationPlan(["levain", "git", "jdk-21"], ["git"]);
  assertEquals(requestedPlan, { gitPkg: "git", jdkPkg: undefined, mvnPkg: undefined, activatePkgs: ["git"] });

  const fallbackPlan = selectActivationPlan(["levain", "custom-tool"], ["custom-tool"]);
  assertEquals(fallbackPlan, { gitPkg: undefined, jdkPkg: undefined, mvnPkg: undefined, activatePkgs: ["custom-tool"] });

  const levainFallback = selectActivationPlan(["levain"], ["missing-pkg"]);
  assertEquals(levainFallback.activatePkgs, ["levain"]);
});

Deno.test("verify-e2e - shell script builders avoid interpolating paths and support tool probes", () => {
  const fullPlan = selectActivationPlan(["levain", "git", "jdk-21", "maven"], []);
  const ps = buildPowerShellCheckScript(fullPlan);
  assertStringIncludes(ps, "[string]$HomeDir");
  assertStringIncludes(ps, ". $LevainPs1 activate @Pkgs");
  assertStringIncludes(ps, "java -version");
  assertStringIncludes(ps, "mvn -version");
  assertStringIncludes(ps, "git --version");

  const cmd = buildCmdCheckScript(fullPlan);
  assertStringIncludes(cmd, "setlocal DisableDelayedExpansion");
  assertStringIncludes(cmd, 'call "%E2E_LEVAIN_CMD%" activate --skip-pre git jdk-21 maven');
  assertStringIncludes(cmd, "java -version");
  assertStringIncludes(cmd, "call mvn -version");
  assertStringIncludes(cmd, "git --version");

  const bash = buildBashCheckScript(fullPlan);
  assertStringIncludes(bash, 'export levainHome="$1"');
  assertStringIncludes(bash, 'source "$LEVAIN_SH_POSIX" activate --skip-pre "$@"');
  assertStringIncludes(bash, "java -version");
  assertStringIncludes(bash, "mvn -version");
  assertStringIncludes(bash, "git --version");

  // Minimal plan without git/jdk/maven omits tool checks
  const minPlan = selectActivationPlan(["levain"], []);
  assertFalse(buildPowerShellCheckScript(minPlan).includes("java -version"));
  assertFalse(buildCmdCheckScript(minPlan).includes("git --version"));
  assertFalse(buildBashCheckScript(minPlan).includes("mvn -version"));
});

Deno.test("verify-e2e - runVerification runs all phases, cleans lock safely, and handles missing Git Bash or failures", async () => {
  // 1. Full happy path with all 4 phases (including Git Bash + 2-process InstanceLock)
  const full = makeMockDeps();
  await runVerification(
    parseVerifyArgs(["--levain-home", "/fake/home", "--expected-version", "1.1.0"]),
    full.deps,
  );
  assert(full.wasKilled(), "sleeper process must be terminated in finally");
  assert(full.removed.some((p) => p.endsWith("levain.lock")), "lock file with matching token must be removed");
  assert(full.logs.some((l) => l.includes("ALL E2E VERIFICATIONS PASSED")));

  // 2. Without Git Bash, only levain installed, --skip-concurrency
  const noBash = makeMockDeps({
    pathExists: (p, kind) => {
      if (p.endsWith("bash.exe")) return false;
      return kind === "file" || kind === "dir";
    },
    readDirEntries: (dirPath) =>
      dirPath.endsWith("registry") ? [{ name: "levain.levain.yaml", isFile: true, isDirectory: false }] : [],
    runProcess: (cmd, args) => {
      if (args.includes("--version")) return Promise.resolve({ code: 0, stdout: "1.1.0\n", stderr: "" });
      if (args.includes("actions")) return Promise.resolve({ code: 0, stdout: "copy\n", stderr: "" });
      if (args.includes("list") || args.includes("info")) return Promise.resolve({ code: 0, stdout: "levain\n", stderr: "" });
      if (args.includes("explain")) return Promise.resolve({ code: 0, stdout: "# levain\n", stderr: "" });
      if (cmd === "powershell.exe") return Promise.resolve({ code: 0, stdout: "PS_LEVAIN_CURRENT=levain\n", stderr: "" });
      if (cmd === "cmd.exe") return Promise.resolve({ code: 0, stdout: "CMD_LEVAIN_CURRENT=levain\n", stderr: "" });
      return Promise.resolve({ code: 0, stdout: "", stderr: "" });
    },
  });
  assertEquals(findGitBashExecutable("/fake/home", noBash.deps), undefined);
  await runVerification(parseVerifyArgs(["--levain-home", "/fake/home", "--skip-concurrency"]), noBash.deps);
  assert(noBash.logs.some((l) => l.includes("[SKIP] Git Bash")));

  // 3. Failure in assertion surfaces clear E2E ASSERTION FAILED and preserves foreign lock token
  const foreignLock = makeMockDeps({
    runProcess: (_cmd, args) => {
      if (args.includes("--version")) return Promise.resolve({ code: 0, stdout: "1.1.0\n", stderr: "" });
      if (args.includes("actions")) return Promise.resolve({ code: 0, stdout: "copy\n", stderr: "" });
      if (args.includes("list") || args.includes("info")) return Promise.resolve({ code: 0, stdout: "levain\n", stderr: "" });
      if (args.includes("explain")) return Promise.resolve({ code: 0, stdout: "# git\nlevain\n", stderr: "" });
      if (args.includes("clean")) return Promise.resolve({ code: 0, stdout: "should have been blocked", stderr: "" });
      return Promise.resolve({ code: 0, stdout: "PS_LEVAIN_CURRENT=git\nCMD_LEVAIN_CURRENT=git\nBASH_LEVAIN_CURRENT=git\n", stderr: "" });
    },
    readTextFile: () => JSON.stringify({ token: "different-owner-token" }),
    spawnSleeper: () => ({
      pid: 9999,
      kill: () => {
        throw new Error("already exited");
      },
    }),
  });
  await assertRejects(
    () => runVerification(parseVerifyArgs(["--levain-home", "/fake/home"]), foreignLock.deps),
    Error,
    "E2E ASSERTION FAILED",
  );
  assertFalse(
    foreignLock.removed.some((p) => p.endsWith("levain.lock")),
    "must not delete lock file owned by a different token",
  );

  // 4. Shell failure output is included in error message (PS, CMD, Bash)
  for (const failingShell of ["powershell.exe", "cmd.exe", "bash.exe"] as const) {
    const mock = makeMockDeps();
    const origRun = mock.deps.runProcess;
    mock.deps.runProcess = (cmd, args, env) => {
      if (cmd === failingShell || (failingShell === "bash.exe" && cmd.endsWith("bash.exe"))) {
        return Promise.resolve({ code: 5, stdout: "out", stderr: "err" });
      }
      return origRun(cmd, args, env);
    };
    await assertRejects(
      () => runVerification(parseVerifyArgs(["--levain-home", "/fake/home", "--skip-concurrency"]), mock.deps),
      Error,
      "exit=5",
    );
  }
});

Deno.test("verify-e2e - createDefaultVerifyDeps and main error handling", async () => {
  const deps = createDefaultVerifyDeps();
  const dir = deps.makeTempDir();
  try {
    const sub = path.join(dir, "nested");
    deps.mkdirRecursive(sub);
    assertEquals(deps.pathExists(sub, "dir"), true);
    assertEquals(deps.pathExists(path.join(sub, "missing"), "file"), false);

    const filePath = path.join(sub, "a.txt");
    deps.writeTextFile(filePath, "hello");
    assertEquals(deps.pathExists(filePath, "file"), true);
    assertEquals(deps.readTextFile(filePath), "hello");

    const exclPath = path.join(sub, "lock.json");
    deps.createExclusiveTextFile(exclPath, '{"ok":true}');
    assertThrows(() => deps.createExclusiveTextFile(exclPath, "dup"));

    assertEquals(deps.readDirEntries(sub).length, 2);
    assertEquals(deps.readDirEntries(path.join(sub, "nope")), []);
    assert(deps.hostname().length > 0);
    assert(deps.generateToken().length > 0);

    const procRes = await deps.runProcess(Deno.execPath(), ["--version"]);
    assertEquals(procRes.code, 0);
    assertStringIncludes(procRes.stdout.toLowerCase(), "deno");

    const sleeper = deps.spawnSleeper();
    assert(sleeper.pid > 0);
    sleeper.kill();
  } finally {
    deps.removePath(dir);
    deps.removePath(path.join(dir, "already-gone"));
  }

  // main() runs parseVerifyArgs + runVerification (fails cleanly when layout missing)
  const argsProp = Object.getOwnPropertyDescriptor(Deno, "args");
  const logStub = stub(console, "log", () => {});
  try {
    Object.defineProperty(Deno, "args", { value: ["--levain-home", path.join(dir, "missing")], configurable: true });
    await assertRejects(() => main(), Error, "E2E ASSERTION FAILED");
  } finally {
    logStub.restore();
    if (argsProp) Object.defineProperty(Deno, "args", argsProp);
  }
});
