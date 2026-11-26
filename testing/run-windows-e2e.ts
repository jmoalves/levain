#!/usr/bin/env -S deno run --allow-all
/**
 * testing/run-windows-e2e.ts
 *
 * Reusable synthetic Windows End-to-End (E2E) runner for Levain.
 *
 * Reuses the exact generic two-variable SSH contract from testing/run-windows-tests.ts:
 *   - LEVAIN_TEST_SSH_CONFIG: path to an ssh_config file
 *   - LEVAIN_TEST_HOST: host alias defined in that ssh_config
 *
 * When either variable is unset (or the config file does not exist), the runner
 * skips cleanly (exit 0) with a clear explanation pointing to AGENTS.md and testing/WINDOWS.md.
 *
 * Supports runtime parameterization (--from-source | --levain-version, repeatable --repo,
 * --packages, optional external --verify TypeScript script) so any public or external catalog
 * can be validated end-to-end on a clean Windows machine without hardcoding private details here.
 */
import * as path from "@std/path";
import {
  buildRemoteCleanupCommand,
  buildScpArgs,
  buildSshArgs,
  createDefaultDeps,
  DEFAULT_DENO_VERSION,
  formatSkipMessage,
  quoteCmdArg,
  resolveWindowsSshContract,
  type RunnerDeps,
} from "./run-windows-tests.ts";

export const DEFAULT_E2E_REPO = "https://github.com/jmoalves/levain-pkgs.git";
export const DEFAULT_E2E_PACKAGES_FILE = path.join("testing", "e2e", "default-packages.txt");
export const DEFAULT_E2E_PACKAGES = [
  "git",
  "jdk-21-ibm-latest",
  "maven-latest",
  "node-runtime-latest",
  "openliberty-runtime-latest",
  "vscode",
  "deno",
  "jq",
];
export const DEFAULT_E2E_REPOSITORY = "jmoalves/levain";
export const BUILTIN_VERIFY_SCRIPT = path.join("testing", "e2e", "verify-e2e.ts");
export const GET_DENO_CMD = path.join("githubScripts", "get-deno.cmd");

export interface E2eRunnerOptions {
  local: boolean;
  fromSource: boolean;
  levainVersion?: string;
  repository: string;
  repos: string[];
  packages: string[];
  verifyScript?: string;
  denoVersion: string;
  keepRemote: boolean;
  testConcurrency: boolean;
}

const UNSAFE_CHARS_RE = /[\r\n\0"%\u2018-\u201B]/;
const UNSAFE_REPO_CHARS_RE = /[\r\n\0"%&|<>^;`$'\u2018-\u201B\s]/;

function assertSafeValue(value: string, flagName: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("-")) {
    throw new Error(`Missing or invalid value for ${flagName}.`);
  }
  if (UNSAFE_CHARS_RE.test(trimmed)) {
    throw new Error(`Unsafe character in ${flagName}: ${JSON.stringify(trimmed)}`);
  }
  return trimmed;
}

export function assertSafeRepo(value: string): string {
  const trimmed = assertSafeValue(value, "--repo");
  if (UNSAFE_REPO_CHARS_RE.test(trimmed)) {
    throw new Error(`Unsafe character in --repo: ${JSON.stringify(trimmed)}`);
  }
  return trimmed;
}

function splitPackageArg(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Parses a curated package list file (supports `#` line comments, blank lines, and
 * whitespace/comma-separated package names) for public or external/private catalogs.
 */
export function parsePackagesFileContent(content: string): string[] {
  const packages: string[] = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    packages.push(...splitPackageArg(line));
  }
  return packages;
}

export function parseE2eArgs(
  args: string[],
  defaultDenoVersion = DEFAULT_DENO_VERSION,
  readTextFile: (filePath: string) => string = Deno.readTextFileSync,
): E2eRunnerOptions {
  let local = false;
  let explicitFromSource = false;
  let levainVersion: string | undefined;
  let repository = DEFAULT_E2E_REPOSITORY;
  const repos: string[] = [];
  const packages: string[] = [];
  let verifyScript: string | undefined;
  let denoVersion = defaultDenoVersion;
  let keepRemote = false;
  let testConcurrency = true;

  const loadPackagesFile = (filePath: string) => {
    const safePath = assertSafeValue(filePath, "--packages-file");
    let content: string;
    try {
      content = readTextFile(safePath);
    } catch (err) {
      throw new Error(
        `Could not read --packages-file '${safePath}': ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    const parsed = parsePackagesFileContent(content);
    if (parsed.length === 0) {
      throw new Error(`No packages found in --packages-file '${safePath}'.`);
    }
    packages.push(...parsed);
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    const readNextValue = (flag: string): string => {
      const next = args[i + 1];
      if (!next || next.startsWith("-")) {
        throw new Error(`Missing value for ${flag}.`);
      }
      i++;
      return next;
    };

    if (arg === "--local") {
      local = true;
    } else if (arg === "--from-source") {
      explicitFromSource = true;
    } else if (arg === "--keep-remote") {
      keepRemote = true;
    } else if (arg === "--skip-concurrency") {
      testConcurrency = false;
    } else if (arg === "--levain-version") {
      levainVersion = assertSafeValue(readNextValue("--levain-version"), "--levain-version");
    } else if (arg.startsWith("--levain-version=")) {
      levainVersion = assertSafeValue(arg.slice("--levain-version=".length), "--levain-version");
    } else if (arg === "--repository") {
      repository = assertSafeValue(readNextValue("--repository"), "--repository");
    } else if (arg.startsWith("--repository=")) {
      repository = assertSafeValue(arg.slice("--repository=".length), "--repository");
    } else if (arg === "--repo") {
      repos.push(assertSafeRepo(readNextValue("--repo")));
    } else if (arg.startsWith("--repo=")) {
      repos.push(assertSafeRepo(arg.slice("--repo=".length)));
    } else if (arg === "--packages") {
      packages.push(...splitPackageArg(assertSafeValue(readNextValue("--packages"), "--packages")));
    } else if (arg.startsWith("--packages=")) {
      packages.push(...splitPackageArg(assertSafeValue(arg.slice("--packages=".length), "--packages")));
    } else if (arg === "--packages-file") {
      loadPackagesFile(readNextValue("--packages-file"));
    } else if (arg.startsWith("--packages-file=")) {
      loadPackagesFile(arg.slice("--packages-file=".length));
    } else if (arg === "--verify") {
      verifyScript = assertSafeValue(readNextValue("--verify"), "--verify");
    } else if (arg.startsWith("--verify=")) {
      verifyScript = assertSafeValue(arg.slice("--verify=".length), "--verify");
    } else if (arg === "--deno-version") {
      denoVersion = assertSafeValue(readNextValue("--deno-version"), "--deno-version");
    } else if (arg.startsWith("--deno-version=")) {
      denoVersion = assertSafeValue(arg.slice("--deno-version=".length), "--deno-version");
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (explicitFromSource && levainVersion) {
    throw new Error("Cannot combine --from-source with --levain-version.");
  }

  if (levainVersion && !/^[0-9]+\.[0-9]+\.[0-9]+$/.test(levainVersion)) {
    throw new Error(`Invalid --levain-version '${levainVersion}'. Expected semver pattern major.minor.patch (e.g. 1.1.0).`);
  }

  if (!/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(repository)) {
    throw new Error(`Invalid --repository '${repository}'. Expected owner/repo (e.g. jmoalves/levain).`);
  }

  if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(denoVersion)) {
    throw new Error(`Invalid --deno-version '${denoVersion}'. Expected semver pattern major.minor.patch (e.g. 2.9.8).`);
  }

  const finalRepos = repos.length > 0 ? repos : [DEFAULT_E2E_REPO];
  const finalPackages = packages.length > 0 ? packages : [...DEFAULT_E2E_PACKAGES];

  for (const pkg of finalPackages) {
    if (!/^[a-zA-Z0-9._-]+$/.test(pkg)) {
      throw new Error(`Invalid package name '${pkg}' in --packages.`);
    }
  }

  return {
    local,
    fromSource: !levainVersion,
    levainVersion,
    repository,
    repos: finalRepos,
    packages: finalPackages,
    verifyScript,
    denoVersion,
    keepRemote,
    testConcurrency,
  };
}

/**
 * Quotes a repo/value for `cmd.exe` (always quoting when `=` is present, since `cmd.exe`
 * treats unquoted `=` as an argument delimiter).
 */
function quoteCmdSafe(value: string): string {
  const base = quoteCmdArg(value);
  if (base.includes("=") && !base.startsWith('"')) {
    return `"${base}"`;
  }
  return base;
}

/**
 * Builds a hardened PowerShell command that downloads `install.ps1` over TLS 1.2 into a
 * temp file (avoiding `iwr | iex`) and reads all dynamic inputs from environment variables.
 */
export function buildReleaseInstallPsCommand(): string {
  return [
    "$ErrorActionPreference = 'Stop'",
    "[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12",
    "$levainHeadless = 'true'",
    "$levainVersion = $env:E2E_LEVAIN_VERSION",
    "$levainRepository = $env:E2E_LEVAIN_REPOSITORY",
    "$levainHome = $env:E2E_LEVAIN_HOME",
    "$levainRepo = $env:E2E_LEVAIN_REPO",
    "$tmpScript = Join-Path $env:TEMP ('levain-install-' + [guid]::NewGuid().ToString('N') + '.ps1')",
    "try { Invoke-WebRequest -Uri $env:E2E_INSTALL_URL -OutFile $tmpScript -UseBasicParsing; & $tmpScript } finally { Remove-Item -LiteralPath $tmpScript -Force -ErrorAction SilentlyContinue }",
  ].join("; ");
}

export function buildRemoteE2eCmdScript(params: {
  remoteDir: string;
  remoteArchive?: string;
  remoteVerifyScript: string;
  remoteGetDenoScript?: string;
  remoteCustomVerifyScript?: string;
  opts: E2eRunnerOptions;
}): string {
  const {
    remoteDir,
    remoteArchive,
    remoteVerifyScript,
    remoteGetDenoScript,
    remoteCustomVerifyScript,
    opts,
  } = params;
  const lines: string[] = [
    "@echo off",
    "setlocal DisableDelayedExpansion",
    `mkdir "${remoteDir}" || exit /b 1`,
    `cd /d "${remoteDir}" || exit /b 1`,
    'set "E2E_LEVAIN_HOME=%CD%\\levain-home"',
    'mkdir "%E2E_LEVAIN_HOME%" || exit /b 1',
  ];

  const addRepoArgs = opts.repos.map((r) => `--addRepo ${quoteCmdSafe(r)}`).join(" ");
  const pkgArgs = opts.packages.map(quoteCmdSafe).join(" ");
  const pkgCsv = opts.packages.join(",");

  if (opts.fromSource) {
    lines.push(
      `tar -xzf "..\\${remoteArchive}" -C "." || exit /b 1`,
      `call scripts\\devLevain.cmd ${opts.denoVersion} || exit /b 1`,
      "call scripts\\levain-build.cmd target || exit /b 1",
      `call target\\levain.cmd ${addRepoArgs} --levainHome "%E2E_LEVAIN_HOME%" --skip-levain-updates --skip-auto-clean install --force levain || exit /b 1`,
    );
  } else {
    const version = opts.levainVersion!;
    const installScriptUrl = `https://github.com/${opts.repository}/releases/download/v${version}/install.ps1`;
    lines.push(
      `set "E2E_LEVAIN_VERSION=${version}"`,
      `set "E2E_LEVAIN_REPOSITORY=${opts.repository}"`,
      `set "E2E_LEVAIN_REPO=${opts.repos[0]}"`,
      `set "E2E_INSTALL_URL=${installScriptUrl}"`,
      `powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "${buildReleaseInstallPsCommand()}" || exit /b 1`,
    );
    if (opts.repos.length > 1) {
      const extraRepoArgs = opts.repos.slice(1).map((r) => `--addRepo ${quoteCmdSafe(r)}`).join(" ");
      lines.push(
        `call "%E2E_LEVAIN_HOME%\\levain\\levain.cmd" ${extraRepoArgs} --levainHome "%E2E_LEVAIN_HOME%" --skip-levain-updates --skip-auto-clean list || exit /b 1`,
      );
    }
    lines.push(
      'mkdir "bin" || exit /b 1',
      `call "..\\${remoteGetDenoScript}" "%CD%\\bin" ${opts.denoVersion} || exit /b 1`,
    );
  }

  lines.push(
    `call "%E2E_LEVAIN_HOME%\\levain\\levain.cmd" --levainHome "%E2E_LEVAIN_HOME%" --skip-levain-updates --skip-auto-clean install ${pkgArgs} || exit /b 1`,
    `call "%E2E_LEVAIN_HOME%\\levain\\levain.cmd" --levainHome "%E2E_LEVAIN_HOME%" --skip-levain-updates --skip-auto-clean update || exit /b 1`,
  );

  const verifyPath = opts.fromSource ? "testing\\e2e\\verify-e2e.ts" : `..\\${remoteVerifyScript}`;
  const expectedVerFlag = opts.levainVersion ? ` --expected-version ${quoteCmdSafe(opts.levainVersion)}` : "";
  const concurrencyFlag = opts.testConcurrency ? "" : " --skip-concurrency";
  lines.push(
    `bin\\deno.exe run --allow-all "${verifyPath}" --levain-home "%E2E_LEVAIN_HOME%" --packages "${pkgCsv}"${expectedVerFlag}${concurrencyFlag} || exit /b 1`,
  );

  if (remoteCustomVerifyScript) {
    lines.push(
      `bin\\deno.exe run --allow-all "..\\${remoteCustomVerifyScript}" --levain-home "%E2E_LEVAIN_HOME%" --packages "${pkgCsv}" || exit /b 1`,
    );
  }

  lines.push("endlocal");
  return lines.join("\r\n") + "\r\n";
}

export function buildRemoteE2eCleanupCommand(pathsToDelete: string[], remoteDir: string): string {
  const parts: string[] = [`if exist "${remoteDir}" rmdir /s /q "${remoteDir}"`];
  for (const file of pathsToDelete) {
    parts.push(`if exist "${file}" del /f /q "${file}"`);
  }
  return parts.join(" & ");
}

export async function runWindowsE2e(
  opts: E2eRunnerOptions,
  deps: RunnerDeps,
): Promise<{ status: "passed" | "skipped" | "failed"; exitCode: number }> {
  const { logger } = deps;

  if (opts.verifyScript && !deps.fileExists(opts.verifyScript)) {
    logger.error(`ERROR: --verify script not found: ${opts.verifyScript}`);
    return { status: "failed", exitCode: 1 };
  }

  if (opts.local) {
    if (deps.os !== "windows") {
      logger.error(
        `ERROR: --local requires Windows (current platform: ${deps.os}). ` +
          `To run on a remote Windows machine over SSH, configure LEVAIN_TEST_SSH_CONFIG and LEVAIN_TEST_HOST (see AGENTS.md and testing/WINDOWS.md).`,
      );
      return { status: "failed", exitCode: 1 };
    }

    const localTempDir = deps.makeTempDir();
    const localHome = path.join(localTempDir, "levain-home");
    try {
      const addRepoArgs = opts.repos.flatMap((r) => ["--addRepo", r]);
      if (opts.fromSource) {
        const devRes = await deps.runCommand("cmd.exe", ["/c", "scripts\\devLevain.cmd", opts.denoVersion], true);
        if (devRes.code !== 0) return { status: "failed", exitCode: devRes.code };
        const buildDir = path.join(localTempDir, "target");
        const buildRes = await deps.runCommand("cmd.exe", ["/c", "scripts\\levain-build.cmd", buildDir], true);
        if (buildRes.code !== 0) return { status: "failed", exitCode: buildRes.code };
        // Invoke compiled levain.exe directly (avoiding cmd.exe metacharacter parsing on --repo)
        const builtExe = path.join(buildDir, "build", "levain.exe");
        const installLevainRes = await deps.runCommand(
          builtExe,
          [
            ...addRepoArgs,
            "--levainHome",
            localHome,
            "--skip-levain-updates",
            "--skip-auto-clean",
            "install",
            "--force",
            "levain",
          ],
          true,
        );
        if (installLevainRes.code !== 0) return { status: "failed", exitCode: installLevainRes.code };
      } else {
        const version = opts.levainVersion!;
        const installUrl = `https://github.com/${opts.repository}/releases/download/v${version}/install.ps1`;
        const prevEnv: Record<string, string | undefined> = {
          E2E_LEVAIN_VERSION: Deno.env.get("E2E_LEVAIN_VERSION"),
          E2E_LEVAIN_REPOSITORY: Deno.env.get("E2E_LEVAIN_REPOSITORY"),
          E2E_LEVAIN_HOME: Deno.env.get("E2E_LEVAIN_HOME"),
          E2E_LEVAIN_REPO: Deno.env.get("E2E_LEVAIN_REPO"),
          E2E_INSTALL_URL: Deno.env.get("E2E_INSTALL_URL"),
        };
        Deno.env.set("E2E_LEVAIN_VERSION", version);
        Deno.env.set("E2E_LEVAIN_REPOSITORY", opts.repository);
        Deno.env.set("E2E_LEVAIN_HOME", localHome);
        Deno.env.set("E2E_LEVAIN_REPO", opts.repos[0]);
        Deno.env.set("E2E_INSTALL_URL", installUrl);
        try {
          const instRes = await deps.runCommand(
            "powershell.exe",
            ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", buildReleaseInstallPsCommand()],
            true,
          );
          if (instRes.code !== 0) return { status: "failed", exitCode: instRes.code };
        } finally {
          for (const [k, v] of Object.entries(prevEnv)) {
            if (v === undefined) Deno.env.delete(k);
            else Deno.env.set(k, v);
          }
        }
      }

      const installedExe = path.join(localHome, "levain", "build", "levain.exe");
      const baseExeArgs = ["--levainHome", localHome, "--skip-levain-updates", "--skip-auto-clean"];

      if (!opts.fromSource && opts.repos.length > 1) {
        const extraRepoArgs = opts.repos.slice(1).flatMap((r) => ["--addRepo", r]);
        const addRes = await deps.runCommand(installedExe, [...baseExeArgs, ...extraRepoArgs, "list"], true);
        if (addRes.code !== 0) return { status: "failed", exitCode: addRes.code };
      }

      const installPkgsRes = await deps.runCommand(installedExe, [...baseExeArgs, "install", ...opts.packages], true);
      if (installPkgsRes.code !== 0) return { status: "failed", exitCode: installPkgsRes.code };

      const updateRes = await deps.runCommand(installedExe, [...baseExeArgs, "update"], true);
      if (updateRes.code !== 0) return { status: "failed", exitCode: updateRes.code };

      const verifyArgs = [
        "run",
        "--allow-all",
        BUILTIN_VERIFY_SCRIPT,
        "--levain-home",
        localHome,
        "--packages",
        opts.packages.join(","),
      ];
      if (!opts.testConcurrency) {
        verifyArgs.push("--skip-concurrency");
      }
      if (opts.levainVersion) {
        verifyArgs.push("--expected-version", opts.levainVersion);
      }
      const verifyRes = await deps.runCommand(Deno.execPath(), verifyArgs, true);
      if (verifyRes.code !== 0) return { status: "failed", exitCode: verifyRes.code };

      if (opts.verifyScript) {
        const customRes = await deps.runCommand(
          Deno.execPath(),
          [
            "run",
            "--allow-all",
            opts.verifyScript,
            "--levain-home",
            localHome,
            "--packages",
            opts.packages.join(","),
          ],
          true,
        );
        if (customRes.code !== 0) return { status: "failed", exitCode: customRes.code };
      }

      return { status: "passed", exitCode: 0 };
    } finally {
      if (!opts.keepRemote) {
        deps.removePath(localTempDir);
      } else {
        logger.log(`Keeping local E2E directory: ${localTempDir}`);
      }
    }
  }

  const resolution = resolveWindowsSshContract(deps.getEnv, deps.fileExists);
  if (!resolution.ok) {
    logger.log(formatSkipMessage(resolution));
    return { status: "skipped", exitCode: 0 };
  }

  const { contract } = resolution;
  const runId = deps.generateRunId();
  const remoteDir = `levain-e2e-${runId}`;
  const remoteArchive = `${remoteDir}.tar.gz`;
  const remoteScript = `${remoteDir}.cmd`;
  const remoteVerifyScript = `${remoteDir}-verify.ts`;
  const remoteGetDenoScript = `${remoteDir}-get-deno.cmd`;
  const remoteCustomVerifyScript = opts.verifyScript ? `${remoteDir}-custom-verify.ts` : undefined;
  const localTempDir = deps.makeTempDir();
  const localArchive = path.join(localTempDir, remoteArchive);
  const localScript = path.join(localTempDir, remoteScript);
  const uploadedFiles: string[] = [remoteScript];

  try {
    if (opts.fromSource) {
      logger.log(`Packaging workspace snapshot for remote Windows E2E run (${runId})...`);
      await deps.createWorkspaceArchive(localArchive);
      uploadedFiles.push(remoteArchive);
      const scpArchiveRes = await deps.runCommand("scp", buildScpArgs(contract, localArchive, remoteArchive), true);
      if (scpArchiveRes.code !== 0) {
        return { status: "failed", exitCode: scpArchiveRes.code };
      }
    } else {
      uploadedFiles.push(remoteVerifyScript, remoteGetDenoScript);
      const scpVerifyRes = await deps.runCommand(
        "scp",
        buildScpArgs(contract, BUILTIN_VERIFY_SCRIPT, remoteVerifyScript),
        true,
      );
      if (scpVerifyRes.code !== 0) {
        return { status: "failed", exitCode: scpVerifyRes.code };
      }
      const scpDenoRes = await deps.runCommand(
        "scp",
        buildScpArgs(contract, GET_DENO_CMD, remoteGetDenoScript),
        true,
      );
      if (scpDenoRes.code !== 0) {
        return { status: "failed", exitCode: scpDenoRes.code };
      }
    }

    if (opts.verifyScript && remoteCustomVerifyScript) {
      uploadedFiles.push(remoteCustomVerifyScript);
      const scpCustomRes = await deps.runCommand(
        "scp",
        buildScpArgs(contract, opts.verifyScript, remoteCustomVerifyScript),
        true,
      );
      if (scpCustomRes.code !== 0) {
        return { status: "failed", exitCode: scpCustomRes.code };
      }
    }

    const scriptContent = buildRemoteE2eCmdScript({
      remoteDir,
      remoteArchive: opts.fromSource ? remoteArchive : undefined,
      remoteVerifyScript,
      remoteGetDenoScript: opts.fromSource ? undefined : remoteGetDenoScript,
      remoteCustomVerifyScript,
      opts,
    });
    deps.writeTextFile(localScript, scriptContent);

    const scpScriptRes = await deps.runCommand("scp", buildScpArgs(contract, localScript, remoteScript), true);
    if (scpScriptRes.code !== 0) {
      return { status: "failed", exitCode: scpScriptRes.code };
    }

    logger.log("Executing Windows E2E suite on remote host via ssh -F (cmd.exe)...");
    const sshRes = await deps.runCommand("ssh", buildSshArgs(contract, `cmd /c "${remoteScript}"`), true);
    if (sshRes.code !== 0) {
      return { status: "failed", exitCode: sshRes.code };
    }

    return { status: "passed", exitCode: 0 };
  } finally {
    if (!opts.keepRemote) {
      const cleanupCmd = opts.fromSource && !remoteCustomVerifyScript
        ? buildRemoteCleanupCommand(remoteDir, remoteArchive, remoteScript)
        : buildRemoteE2eCleanupCommand(uploadedFiles, remoteDir);
      await deps.runCommand("ssh", buildSshArgs(contract, cleanupCmd), false);
    } else {
      logger.log(`Keeping remote E2E directory: ${remoteDir}`);
    }
    deps.removePath(localTempDir);
  }
}

export async function main() {
  const envDenoVersion = Deno.env.get("LEVAIN_TEST_DENO_VERSION")?.trim() || DEFAULT_DENO_VERSION;
  const opts = parseE2eArgs(Deno.args, envDenoVersion);
  const result = await runWindowsE2e(opts, createDefaultDeps());
  Deno.exit(result.exitCode);
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("Unexpected error:", err instanceof Error ? err.message : String(err));
    Deno.exit(1);
  });
}
