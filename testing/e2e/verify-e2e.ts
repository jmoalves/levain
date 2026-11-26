#!/usr/bin/env -S deno run --allow-all
/**
 * testing/e2e/verify-e2e.ts
 *
 * Real-effect End-to-End (E2E) verifier for an installed Levain environment on Windows.
 *
 * Designed to run standalone with `deno run --allow-all testing/e2e/verify-e2e.ts`
 * (using only Deno built-ins and `node:path`/`node:os` so it works without downloading
 * external packages even in isolated release-validation runs).
 *
 * Verifies:
 *  1. Installation layout (`levain.cmd`, `levain.ps1`, `levain.sh`, `build/levain.exe`, registry)
 *  2. Core compiled CLI commands (`--version`, `actions`, `list`, `info --verbose`,
 *     `explain`, `explain --uninstall`, `clean`)
 *  3. Real shell activation (`levain activate`) across PowerShell, CMD, and Git Bash,
 *     plus real tool execution (`git`, `java`, `mvn`) when those recipes are installed
 *  4. Real 2-process `InstanceLock` concurrency (read-only allowed, mutating blocked)
 */
import * as os from "node:os";
import * as path from "node:path";

export interface VerifyOptions {
  levainHome: string;
  packages: string[];
  expectedVersion?: string;
  skipConcurrency: boolean;
}

export interface ProcessResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface LiveProcessHandle {
  pid: number;
  kill: () => void;
}

export interface VerifyDeps {
  pathExists: (targetPath: string, kind: "file" | "dir") => boolean;
  readDirEntries: (dirPath: string) => Array<{ name: string; isFile: boolean; isDirectory: boolean }>;
  makeTempDir: () => string;
  writeTextFile: (filePath: string, content: string) => void;
  createExclusiveTextFile: (filePath: string, content: string) => void;
  readTextFile: (filePath: string) => string;
  mkdirRecursive: (dirPath: string) => void;
  removePath: (targetPath: string) => void;
  runProcess: (
    cmd: string,
    args: string[],
    env?: Record<string, string>,
  ) => Promise<ProcessResult>;
  spawnSleeper: () => LiveProcessHandle;
  hostname: () => string;
  generateToken: () => string;
  logger: { log: (...args: unknown[]) => void };
}

export const SAFE_PKG_NAME_RE = /^[a-zA-Z0-9._-]+$/;
export const SEMVER_RE = /^[0-9]+\.[0-9]+\.[0-9]+$/;

export function splitPackages(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export function assertValidPackageName(name: string): string {
  if (!SAFE_PKG_NAME_RE.test(name)) {
    throw new Error(`Invalid package name '${name}'. Expected pattern ${SAFE_PKG_NAME_RE}.`);
  }
  return name;
}

export function parseVerifyArgs(
  args: string[],
  defaultHome = path.join(os.homedir(), "levain"),
): VerifyOptions {
  let levainHome = defaultHome;
  const packages: string[] = [];
  let expectedVersion: string | undefined;
  let skipConcurrency = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const readNext = (flag: string): string => {
      const next = args[i + 1];
      if (!next || next.startsWith("-")) {
        throw new Error(`Missing value for ${flag}.`);
      }
      i++;
      return next;
    };

    if (arg === "--skip-concurrency") {
      skipConcurrency = true;
    } else if (arg === "--levain-home") {
      levainHome = readNext("--levain-home");
    } else if (arg.startsWith("--levain-home=")) {
      levainHome = arg.slice("--levain-home=".length);
    } else if (arg === "--packages") {
      packages.push(...splitPackages(readNext("--packages")));
    } else if (arg.startsWith("--packages=")) {
      packages.push(...splitPackages(arg.slice("--packages=".length)));
    } else if (arg === "--expected-version") {
      expectedVersion = readNext("--expected-version");
    } else if (arg.startsWith("--expected-version=")) {
      expectedVersion = arg.slice("--expected-version=".length);
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  levainHome = levainHome.trim();
  if (!levainHome) {
    throw new Error("Missing value for --levain-home.");
  }
  if (expectedVersion !== undefined) {
    expectedVersion = expectedVersion.trim();
    if (!SEMVER_RE.test(expectedVersion)) {
      throw new Error(`Invalid --expected-version '${expectedVersion}'. Expected major.minor.patch.`);
    }
  }
  for (const pkg of packages) {
    assertValidPackageName(pkg);
  }

  return {
    levainHome: path.resolve(levainHome),
    packages,
    expectedVersion,
    skipConcurrency,
  };
}

function assertOk(condition: boolean, message: string, logger: { log: (...args: unknown[]) => void }): void {
  if (!condition) {
    throw new Error(`E2E ASSERTION FAILED: ${message}`);
  }
  logger.log(`  [OK] ${message}`);
}

export interface ToolProbes {
  gitPkg?: string;
  jdkPkg?: string;
  mvnPkg?: string;
  activatePkgs: string[];
}

export function selectActivationPlan(installedRecipes: string[], requestedPackages: string[]): ToolProbes {
  const pool = requestedPackages.length > 0
    ? requestedPackages.filter((p) => installedRecipes.includes(p))
    : installedRecipes;

  const gitPkg = pool.find((p) => /^git($|-)/.test(p) && p !== "git-config");
  const jdkPkg = pool.find((p) => /^jdk($|-)/.test(p));
  const mvnPkg = pool.find((p) => /^maven($|-)/.test(p));

  const activatePkgs: string[] = [];
  if (gitPkg) activatePkgs.push(gitPkg);
  if (jdkPkg) activatePkgs.push(jdkPkg);
  if (mvnPkg) activatePkgs.push(mvnPkg);

  if (activatePkgs.length === 0) {
    activatePkgs.push(pool[0] ?? "levain");
  }

  for (const pkg of activatePkgs) {
    assertValidPackageName(pkg);
  }

  return { gitPkg, jdkPkg, mvnPkg, activatePkgs };
}

/**
 * Generates a static PowerShell script that receives all paths and package names
 * strictly via positional arguments (no path/package string interpolation).
 */
export function buildPowerShellCheckScript(probes: ToolProbes): string {
  const lines = [
    "param(",
    "  [Parameter(Mandatory = $true)][string]$HomeDir,",
    "  [Parameter(Mandatory = $true)][string]$LevainPs1,",
    "  [Parameter(ValueFromRemainingArguments = $true)][string[]]$Pkgs",
    ")",
    '$ErrorActionPreference = "Stop"',
    "$env:levainHome = $HomeDir",
    ". $LevainPs1 activate @Pkgs",
    'if ($LASTEXITCODE -ne 0) { throw "levain.ps1 activate failed with exit code $LASTEXITCODE" }',
    'if (-not $env:LEVAIN_CURRENT) { throw "LEVAIN_CURRENT was not set by PowerShell activate" }',
    'Write-Output "PS_LEVAIN_CURRENT=$env:LEVAIN_CURRENT"',
    '$ErrorActionPreference = "Continue"',
  ];
  if (probes.jdkPkg) {
    lines.push(
      'if (-not $env:JAVA_HOME -or -not (Test-Path -LiteralPath $env:JAVA_HOME)) { throw "JAVA_HOME missing or invalid" }',
      'Write-Output "PS_JAVA_HOME=$env:JAVA_HOME"',
      'java -version 2>&1 | ForEach-Object { "$_" }',
      'if ($LASTEXITCODE -ne 0) { throw "java -version failed in activated PowerShell" }',
    );
  }
  if (probes.mvnPkg) {
    lines.push(
      'mvn -version 2>&1 | Select-Object -First 3 | ForEach-Object { "$_" }',
      'if ($LASTEXITCODE -ne 0) { throw "mvn -version failed in activated PowerShell" }',
    );
  }
  if (probes.gitPkg) {
    lines.push(
      'git --version 2>&1 | ForEach-Object { "$_" }',
      'if ($LASTEXITCODE -ne 0) { throw "git --version failed in activated PowerShell" }',
    );
  }
  return lines.join("\r\n") + "\r\n";
}

/**
 * Generates a CMD script that reads paths strictly from inherited environment variables
 * (`levainHome` and `E2E_LEVAIN_CMD`) with `DisableDelayedExpansion` and validated package names.
 */
export function buildCmdCheckScript(probes: ToolProbes): string {
  const pkgArgs = probes.activatePkgs.map(assertValidPackageName).join(" ");
  const lines = [
    "@echo off",
    "setlocal DisableDelayedExpansion",
    `call "%E2E_LEVAIN_CMD%" activate --skip-pre ${pkgArgs}`,
    "if errorlevel 1 exit /b %errorlevel%",
    "if not defined LEVAIN_CURRENT exit /b 91",
    "echo CMD_LEVAIN_CURRENT=%LEVAIN_CURRENT%",
  ];
  if (probes.jdkPkg) {
    lines.push(
      "if not defined JAVA_HOME exit /b 92",
      "echo CMD_JAVA_HOME=%JAVA_HOME%",
      "java -version 2>&1",
      "if errorlevel 1 exit /b 93",
    );
  }
  if (probes.mvnPkg) {
    lines.push(
      "call mvn -version 2>&1",
      "if errorlevel 1 exit /b 94",
    );
  }
  if (probes.gitPkg) {
    lines.push(
      "git --version 2>&1",
      "if errorlevel 1 exit /b 95",
    );
  }
  lines.push("endlocal");
  return lines.join("\r\n") + "\r\n";
}

/**
 * Generates a static Bash script receiving home dir, levain.sh path, and packages
 * strictly via positional arguments (`"$1"`, `"$2"`, `"${@:3}"`).
 */
export function buildBashCheckScript(probes: ToolProbes): string {
  const lines = [
    "set -e",
    'export levainHome="$1"',
    'LEVAIN_SH_POSIX="$(cygpath -u "$2" 2>/dev/null || echo "$2")"',
    "shift 2",
    'source "$LEVAIN_SH_POSIX" activate --skip-pre "$@"',
    'test -n "${LEVAIN_CURRENT:-}"',
    'echo "BASH_LEVAIN_CURRENT=${LEVAIN_CURRENT}"',
  ];
  if (probes.jdkPkg) {
    lines.push('test -n "${JAVA_HOME:-}"', "java -version 2>&1");
  }
  if (probes.mvnPkg) {
    lines.push("mvn -version 2>&1 | head -n 3");
  }
  if (probes.gitPkg) {
    lines.push("git --version 2>&1");
  }
  return lines.join("\n") + "\n";
}

export function findGitBashExecutable(levainHome: string, deps: VerifyDeps): string | undefined {
  const candidates: string[] = [];
  for (const entry of deps.readDirEntries(levainHome)) {
    if (entry.isDirectory && entry.name.toLowerCase().startsWith("git")) {
      candidates.push(path.join(levainHome, entry.name, "bin", "bash.exe"));
    }
  }
  candidates.push(
    "C:\\Program Files\\Git\\bin\\bash.exe",
    "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
  );
  return candidates.find((candidate) => deps.pathExists(candidate, "file"));
}

export async function runVerification(opts: VerifyOptions, deps: VerifyDeps): Promise<void> {
  const { logger } = deps;
  const levainHome = opts.levainHome;
  const levainDir = path.join(levainHome, "levain");
  const levainCmd = path.join(levainDir, "levain.cmd");
  const levainPs1 = path.join(levainDir, "levain.ps1");
  const levainSh = path.join(levainDir, "levain.sh");
  const levainExe = path.join(levainDir, "build", "levain.exe");
  const registryDir = path.join(levainHome, ".levain", "registry");
  const lockFile = path.join(levainHome, ".levain", "levain.lock");

  // 1. Installation layout
  logger.log(`\n=== E2E VERIFY: Installation layout (${levainHome})`);
  assertOk(deps.pathExists(levainCmd, "file"), `levain.cmd exists at ${levainCmd}`, logger);
  assertOk(deps.pathExists(levainPs1, "file"), `levain.ps1 exists at ${levainPs1}`, logger);
  assertOk(deps.pathExists(levainSh, "file"), `levain.sh exists at ${levainSh}`, logger);
  assertOk(deps.pathExists(levainExe, "file"), `compiled levain.exe exists at ${levainExe}`, logger);
  assertOk(deps.pathExists(registryDir, "dir"), `registry dir exists at ${registryDir}`, logger);
  assertOk(
    deps.pathExists(path.join(registryDir, "levain.levain.yaml"), "file"),
    "levain registered in .levain/registry",
    logger,
  );

  const installedRecipes = deps
    .readDirEntries(registryDir)
    .filter((e) => e.isFile && e.name.endsWith(".levain.yaml"))
    .map((e) => e.name.slice(0, -".levain.yaml".length))
    .sort();
  logger.log(`  Installed packages (${installedRecipes.length}): ${installedRecipes.join(", ")}`);
  assertOk(installedRecipes.includes("levain"), "installed registry includes 'levain'", logger);

  // 2. Core compiled CLI commands
  logger.log("\n=== E2E VERIFY: Core CLI commands on compiled levain.exe");
  const baseArgs = ["--levainHome", levainHome, "--skip-levain-updates", "--skip-auto-clean"];

  const verRes = await deps.runProcess(levainExe, ["--version"]);
  assertOk(verRes.code === 0, `levain --version exits 0 (${verRes.stdout.trim()})`, logger);
  assertOk(/\d+\.\d+\.\d+/.test(verRes.stdout), "levain --version prints semver", logger);
  if (opts.expectedVersion) {
    assertOk(
      verRes.stdout.includes(opts.expectedVersion),
      `levain --version matches expected '${opts.expectedVersion}'`,
      logger,
    );
  }

  const actionsRes = await deps.runProcess(levainExe, [...baseArgs, "actions", "copy"]);
  assertOk(actionsRes.code === 0, "levain actions copy exits 0", logger);
  assertOk((actionsRes.stdout + actionsRes.stderr).includes("copy"), "levain actions copy describes copy", logger);

  const listRes = await deps.runProcess(levainExe, [...baseArgs, "list"]);
  assertOk(listRes.code === 0, "levain list exits 0", logger);
  assertOk((listRes.stdout + listRes.stderr).includes("levain"), "levain list includes levain", logger);

  const infoRes = await deps.runProcess(levainExe, [...baseArgs, "info", "--verbose"]);
  assertOk(infoRes.code === 0, "levain info --verbose exits 0", logger);
  assertOk((infoRes.stdout + infoRes.stderr).includes("levain"), "levain info --verbose reports levain", logger);

  const explainTarget = installedRecipes.find((p) => p !== "levain") ?? "levain";
  const explainRes = await deps.runProcess(levainExe, [...baseArgs, "explain", explainTarget]);
  assertOk(explainRes.code === 0, `levain explain ${explainTarget} exits 0`, logger);
  assertOk(explainRes.stdout.trimStart().startsWith("# "), "levain explain stdout is clean Markdown", logger);
  assertOk(explainRes.stdout.includes(explainTarget), `levain explain mentions '${explainTarget}'`, logger);
  assertOk(!/\[INFO\]|\[DEBUG\]/.test(explainRes.stdout), "levain explain stdout has no log pollution", logger);

  const uninstallRes = await deps.runProcess(levainExe, [...baseArgs, "explain", "--uninstall"]);
  assertOk(uninstallRes.code === 0, "levain explain --uninstall exits 0", logger);
  assertOk(uninstallRes.stdout.trimStart().startsWith("# "), "levain explain --uninstall stdout is clean Markdown", logger);
  assertOk(uninstallRes.stdout.includes("levain"), "levain explain --uninstall includes levain", logger);
  const otherInstalled = installedRecipes.find((p) => p !== "levain");
  if (otherInstalled) {
    assertOk(
      uninstallRes.stdout.includes(otherInstalled),
      `levain explain --uninstall includes installed package '${otherInstalled}'`,
      logger,
    );
  }

  const cleanRes = await deps.runProcess(levainExe, [...baseArgs, "clean"]);
  assertOk(cleanRes.code === 0, "levain clean exits 0", logger);

  // 3. Shell activation (PowerShell, CMD, Git Bash) + real tool probes
  logger.log("\n=== E2E VERIFY: Shell activation (PowerShell, CMD, Git Bash) and tool execution");
  const plan = selectActivationPlan(installedRecipes, opts.packages);
  logger.log(
    `  Activation packages: ${plan.activatePkgs.join(", ")} (probes: git=${Boolean(plan.gitPkg)}, jdk=${Boolean(plan.jdkPkg)}, maven=${Boolean(plan.mvnPkg)})`,
  );

  const tempWork = deps.makeTempDir();
  try {
    // 3a. PowerShell activation (full pre + cmd, positional args)
    const psScript = path.join(tempWork, "check-ps.ps1");
    deps.writeTextFile(psScript, buildPowerShellCheckScript(plan));
    const psRes = await deps.runProcess("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      psScript,
      levainHome,
      levainPs1,
      ...plan.activatePkgs,
    ]);
    assertOk(
      psRes.code === 0,
      `PowerShell 'levain activate' succeeds (exit=${psRes.code})${psRes.code !== 0 ? `\n${psRes.stdout}\n${psRes.stderr}` : ""}`,
      logger,
    );
    assertOk(/PS_LEVAIN_CURRENT=.+/.test(psRes.stdout), "PowerShell activate sets LEVAIN_CURRENT", logger);

    // 3b. CMD activation (inherited env vars + DisableDelayedExpansion)
    const cmdScript = path.join(tempWork, "check-cmd.cmd");
    deps.writeTextFile(cmdScript, buildCmdCheckScript(plan));
    const cmdRes = await deps.runProcess("cmd.exe", ["/c", cmdScript], {
      levainHome,
      E2E_LEVAIN_CMD: levainCmd,
    });
    assertOk(
      cmdRes.code === 0,
      `CMD 'levain activate' succeeds (exit=${cmdRes.code})${cmdRes.code !== 0 ? `\n${cmdRes.stdout}\n${cmdRes.stderr}` : ""}`,
      logger,
    );
    assertOk(/CMD_LEVAIN_CURRENT=.+/.test(cmdRes.stdout), "CMD activate sets LEVAIN_CURRENT", logger);

    // 3c. Git Bash activation (positional args, when bash.exe is present)
    const bashExe = findGitBashExecutable(levainHome, deps);
    if (bashExe) {
      logger.log(`  Testing Git Bash activation using: ${bashExe}`);
      const bashScript = path.join(tempWork, "check-bash.sh");
      deps.writeTextFile(bashScript, buildBashCheckScript(plan));
      const bashRes = await deps.runProcess(bashExe, [
        "--noprofile",
        "--norc",
        bashScript.replaceAll("\\", "/"),
        levainHome.replaceAll("\\", "/"),
        levainSh.replaceAll("\\", "/"),
        ...plan.activatePkgs,
      ]);
      assertOk(
        bashRes.code === 0,
        `Git Bash 'source levain.sh activate' succeeds (exit=${bashRes.code})${bashRes.code !== 0 ? `\n${bashRes.stdout}\n${bashRes.stderr}` : ""}`,
        logger,
      );
      assertOk(/BASH_LEVAIN_CURRENT=.+/.test(bashRes.stdout), "Git Bash activate sets LEVAIN_CURRENT", logger);
    } else {
      logger.log("  [SKIP] Git Bash (bash.exe) not found; skipping Git Bash activation probe.");
    }
  } finally {
    deps.removePath(tempWork);
  }

  // 4. Real 2-process InstanceLock concurrency check
  if (!opts.skipConcurrency) {
    logger.log("\n=== E2E VERIFY: Real 2-process InstanceLock concurrency");
    const holder = deps.spawnSleeper();
    const lockToken = deps.generateToken();
    let lockCreated = false;
    try {
      deps.mkdirRecursive(path.dirname(lockFile));
      const lockJson = JSON.stringify({
        pid: holder.pid,
        command: "install",
        startedAt: new Date().toISOString(),
        hostname: deps.hostname(),
        token: lockToken,
      });
      // Create exclusively so we never clobber an active real Levain instance
      deps.createExclusiveTextFile(lockFile, lockJson);
      lockCreated = true;

      const readOnlyRes = await deps.runProcess(levainExe, [...baseArgs, "actions"]);
      assertOk(readOnlyRes.code === 0, "read-only 'levain actions' succeeds while lock is held", logger);

      const mutatingRes = await deps.runProcess(levainExe, [...baseArgs, "clean"]);
      const combined = `${mutatingRes.stdout}\n${mutatingRes.stderr}`;
      assertOk(mutatingRes.code !== 0, "mutating 'levain clean' is blocked while lock is held", logger);
      assertOk(
        combined.includes(String(holder.pid)),
        `lock error message reports live holder PID (${holder.pid})`,
        logger,
      );
    } finally {
      try {
        holder.kill();
      } catch {
        // ignore if already exited
      }
      if (lockCreated) {
        try {
          const current = JSON.parse(deps.readTextFile(lockFile));
          if (current?.token === lockToken) {
            deps.removePath(lockFile);
          }
        } catch {
          // ignore if already removed or unreadable
        }
      }
    }
  }

  logger.log("\n=== ALL E2E VERIFICATIONS PASSED ===");
}

export function buildChildEnv(
  baseEnv: Record<string, string>,
  overrides?: Record<string, string>,
  stripKeys: string[] = [],
): Record<string, string> {
  const stripSet = new Set(stripKeys.map((k) => k.toLowerCase()));
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(baseEnv)) {
    if (!stripSet.has(k.toLowerCase())) {
      result[k] = v;
    }
  }
  if (overrides) {
    for (const [k, v] of Object.entries(overrides)) {
      result[k] = v;
    }
  }
  return result;
}

export function buildProcessCommandOptions(
  cmd: string,
  args: string[],
  env?: Record<string, string>,
  getBaseEnv: () => Record<string, string> = () => Deno.env.toObject(),
): Deno.CommandOptions {
  // Windows PowerShell 5.1 fails to load built-in modules (e.g. Select-Object, Get-FileHash)
  // if it inherits PowerShell 7's PSModulePath from a parent `pwsh` shell.
  if (cmd.toLowerCase() === "powershell.exe") {
    return {
      args,
      clearEnv: true,
      env: buildChildEnv(getBaseEnv(), env, ["PSModulePath"]),
      stdout: "piped",
      stderr: "piped",
    };
  }
  return {
    args,
    env,
    stdout: "piped",
    stderr: "piped",
  };
}

export function createDefaultVerifyDeps(): VerifyDeps {
  return {
    pathExists: (targetPath: string, kind: "file" | "dir") => {
      try {
        const info = Deno.statSync(targetPath);
        return kind === "file" ? info.isFile : info.isDirectory;
      } catch {
        return false;
      }
    },
    readDirEntries: (dirPath: string) => {
      try {
        return [...Deno.readDirSync(dirPath)].map((e) => ({
          name: e.name,
          isFile: e.isFile,
          isDirectory: e.isDirectory,
        }));
      } catch {
        return [];
      }
    },
    makeTempDir: () => Deno.makeTempDirSync({ prefix: "levain-e2e-verify-" }),
    writeTextFile: (filePath: string, content: string) => Deno.writeTextFileSync(filePath, content),
    createExclusiveTextFile: (filePath: string, content: string) => {
      const file = Deno.openSync(filePath, { write: true, createNew: true });
      try {
        file.writeSync(new TextEncoder().encode(content));
      } finally {
        file.close();
      }
    },
    readTextFile: (filePath: string) => Deno.readTextFileSync(filePath),
    mkdirRecursive: (dirPath: string) => Deno.mkdirSync(dirPath, { recursive: true }),
    removePath: (targetPath: string) => {
      try {
        Deno.removeSync(targetPath, { recursive: true });
      } catch {
        // ignore cleanup error
      }
    },
    runProcess: async (cmd: string, args: string[], env?: Record<string, string>) => {
      const command = new Deno.Command(cmd, buildProcessCommandOptions(cmd, args, env));
      const out = await command.output();
      return {
        code: out.code,
        stdout: new TextDecoder().decode(out.stdout),
        stderr: new TextDecoder().decode(out.stderr),
      };
    },
    spawnSleeper: () => {
      const child = new Deno.Command(Deno.execPath(), {
        args: ["eval", "setTimeout(() => {}, 30000)"],
        stdout: "null",
        stderr: "null",
      }).spawn();
      return {
        pid: child.pid,
        kill: () => child.kill(),
      };
    },
    hostname: () => os.hostname(),
    generateToken: () => crypto.randomUUID(),
    logger: console,
  };
}

export async function main(): Promise<void> {
  const opts = parseVerifyArgs(Deno.args);
  await runVerification(opts, createDefaultVerifyDeps());
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    Deno.exit(1);
  });
}
