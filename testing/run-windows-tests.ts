#!/usr/bin/env -S deno run --allow-all
/**
 * testing/run-windows-tests.ts
 *
 * Unified Windows test runner for Levain:
 *  - Preferred (default): runs the test suite on a remote Windows machine
 *    reachable over SSH via the generic two-variable contract:
 *      - LEVAIN_TEST_SSH_CONFIG: path to an ssh_config file
 *      - LEVAIN_TEST_HOST: host alias defined in that ssh_config
 *    When either variable is unset (or the config file does not exist), the
 *    runner skips cleanly (exit 0) with a clear explanation pointing to the
 *    contract in AGENTS.md and testing/WINDOWS.md.
 *  - Local (--local): runs directly on the current Windows machine.
 */
import { existsSync } from "@std/fs";
import * as path from "@std/path";

export const SSH_CONFIG_ENV = "LEVAIN_TEST_SSH_CONFIG";
export const SSH_HOST_ENV = "LEVAIN_TEST_HOST";
export const DEFAULT_DENO_VERSION = "2.9.8";
export const CONTRACT_DOCS = "AGENTS.md and testing/WINDOWS.md";

export interface RunnerOptions {
  local: boolean;
  checkOnly: boolean;
  keepRemote: boolean;
  denoVersion: string;
  denoTestArgs: string[];
}

export interface WindowsSshContract {
  sshConfig: string;
  host: string;
}

export type ContractResolution =
  | { ok: true; contract: WindowsSshContract }
  | { ok: false; missing: string[]; reason: string };

export interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface Logger {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export interface RunnerDeps {
  getEnv: (name: string) => string | undefined;
  fileExists: (filePath: string) => boolean;
  os: string;
  runCommand: (cmd: string, args: string[], inheritStdio?: boolean) => Promise<CommandResult>;
  createWorkspaceArchive: (archivePath: string) => Promise<void>;
  makeTempDir: () => string;
  writeTextFile: (filePath: string, content: string) => void;
  removePath: (targetPath: string) => void;
  generateRunId: () => string;
  logger: Logger;
}

export function parseArgs(args: string[], defaultDenoVersion = DEFAULT_DENO_VERSION): RunnerOptions {
  let local = false;
  let checkOnly = false;
  let keepRemote = false;
  let denoVersion = defaultDenoVersion;
  const denoTestArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--") {
      denoTestArgs.push(...args.slice(i + 1));
      break;
    }
    if (arg === "--local") {
      local = true;
    } else if (arg === "--check-only") {
      checkOnly = true;
    } else if (arg === "--keep-remote") {
      keepRemote = true;
    } else if (arg === "--deno-version") {
      const next = args[i + 1];
      if (!next || next.startsWith("-")) {
        throw new Error("Missing value for --deno-version (expected e.g. 2.9.8).");
      }
      denoVersion = next;
      i++;
    } else if (arg.startsWith("--deno-version=")) {
      denoVersion = arg.slice("--deno-version=".length);
    } else {
      denoTestArgs.push(arg);
    }
  }

  if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(denoVersion)) {
    throw new Error(`Invalid --deno-version '${denoVersion}'. Expected semver pattern major.minor.patch (e.g. 2.9.8).`);
  }

  return { local, checkOnly, keepRemote, denoVersion, denoTestArgs };
}

export function resolveWindowsSshContract(
  getEnv: (name: string) => string | undefined,
  fileExists: (filePath: string) => boolean,
): ContractResolution {
  const sshConfig = getEnv(SSH_CONFIG_ENV)?.trim() ?? "";
  const host = getEnv(SSH_HOST_ENV)?.trim() ?? "";

  const missing: string[] = [];
  if (!sshConfig) missing.push(SSH_CONFIG_ENV);
  if (!host) missing.push(SSH_HOST_ENV);

  if (missing.length > 0) {
    return {
      ok: false,
      missing,
      reason: `Missing required environment variable(s): ${missing.join(", ")}.`,
    };
  }

  if (!fileExists(sshConfig)) {
    return {
      ok: false,
      missing: [],
      reason: `${SSH_CONFIG_ENV} points to a file that does not exist.`,
    };
  }

  return {
    ok: true,
    contract: { sshConfig, host },
  };
}

export function formatSkipMessage(resolution: Extract<ContractResolution, { ok: false }>): string {
  const lines = [
    `SKIP: Remote Windows tests skipped — ${resolution.reason}`,
    `Contract: set ${SSH_CONFIG_ENV} (path to ssh_config) and ${SSH_HOST_ENV} (host alias inside it).`,
    `Documentation: see ${CONTRACT_DOCS}.`,
    `Local Windows option: if you are already on Windows, run 'deno task test:windows -- --local' or 'deno task integrate'.`,
  ];
  return lines.join("\n");
}

export function buildSshArgs(contract: WindowsSshContract, remoteCommand: string): string[] {
  return ["-F", contract.sshConfig, contract.host, remoteCommand];
}

export function buildScpArgs(contract: WindowsSshContract, localPath: string, remoteTarget: string): string[] {
  return ["-F", contract.sshConfig, localPath, `${contract.host}:${remoteTarget}`];
}

export function quoteCmdArg(arg: string): string {
  if (/^[a-zA-Z0-9._:=\\/+-]+$/.test(arg)) {
    return arg;
  }
  const escaped = arg.replace(/"/g, '\\"');
  return `"${escaped}"`;
}

export function buildRemoteCmdScript(params: {
  remoteDir: string;
  remoteArchive: string;
  denoVersion: string;
  checkOnly: boolean;
  denoTestArgs: string[];
}): string {
  const { remoteDir, remoteArchive, denoVersion, checkOnly, denoTestArgs } = params;
  const lines = [
    "@echo off",
    "setlocal",
    `mkdir "${remoteDir}" || exit /b 1`,
    `tar -xzf "${remoteArchive}" -C "${remoteDir}" || exit /b 1`,
    `cd /d "${remoteDir}" || exit /b 1`,
    `call scripts\\devLevain.cmd ${denoVersion} || exit /b 1`,
    `set "PATH=%CD%\\bin;%CD%\\extra-bin\\windows\\git\\cmd;%PATH%"`,
    "bin\\deno.exe check levain.ts || exit /b 1",
    "bin\\deno.exe lint || exit /b 1",
  ];

  if (!checkOnly) {
    const extra = denoTestArgs.map(quoteCmdArg).join(" ");
    const testLine = extra
      ? `bin\\deno.exe test --allow-all --parallel ${extra} || exit /b 1`
      : "bin\\deno.exe test --allow-all --parallel || exit /b 1";
    lines.push(testLine);
  }

  lines.push("endlocal");
  return lines.join("\r\n") + "\r\n";
}

export function buildRemoteCleanupCommand(remoteDir: string, remoteArchive: string, remoteScript: string): string {
  return [
    `if exist "${remoteDir}" rmdir /s /q "${remoteDir}"`,
    `if exist "${remoteArchive}" del /f /q "${remoteArchive}"`,
    `if exist "${remoteScript}" del /f /q "${remoteScript}"`,
  ].join(" & ");
}

export async function runWindowsTests(
  opts: RunnerOptions,
  deps: RunnerDeps,
): Promise<{ status: "passed" | "skipped" | "failed"; exitCode: number }> {
  const { logger } = deps;

  if (opts.local) {
    if (deps.os !== "windows") {
      logger.error(
        `ERROR: --local requires Windows (current platform: ${deps.os}). ` +
          `To run on a remote Windows machine over SSH, configure ${SSH_CONFIG_ENV} and ${SSH_HOST_ENV} (see ${CONTRACT_DOCS}).`,
      );
      return { status: "failed", exitCode: 1 };
    }

    const checkRes = await deps.runCommand(Deno.execPath(), ["check", "levain.ts"], true);
    if (checkRes.code !== 0) return { status: "failed", exitCode: checkRes.code };

    const lintRes = await deps.runCommand(Deno.execPath(), ["lint"], true);
    if (lintRes.code !== 0) return { status: "failed", exitCode: lintRes.code };

    if (!opts.checkOnly) {
      const testRes = await deps.runCommand(
        Deno.execPath(),
        ["test", "--allow-all", "--parallel", ...opts.denoTestArgs],
        true,
      );
      if (testRes.code !== 0) return { status: "failed", exitCode: testRes.code };
    }

    return { status: "passed", exitCode: 0 };
  }

  const resolution = resolveWindowsSshContract(deps.getEnv, deps.fileExists);
  if (!resolution.ok) {
    logger.log(formatSkipMessage(resolution));
    return { status: "skipped", exitCode: 0 };
  }

  const { contract } = resolution;
  const runId = deps.generateRunId();
  const remoteDir = `levain-test-${runId}`;
  const remoteArchive = `${remoteDir}.tar.gz`;
  const remoteScript = `${remoteDir}.cmd`;
  const localTempDir = deps.makeTempDir();
  const localArchive = path.join(localTempDir, remoteArchive);
  const localScript = path.join(localTempDir, remoteScript);

  try {
    logger.log(`Packaging workspace snapshot for remote Windows run (${runId})...`);
    await deps.createWorkspaceArchive(localArchive);

    const scriptContent = buildRemoteCmdScript({
      remoteDir,
      remoteArchive,
      denoVersion: opts.denoVersion,
      checkOnly: opts.checkOnly,
      denoTestArgs: opts.denoTestArgs,
    });
    deps.writeTextFile(localScript, scriptContent);

    logger.log("Copying workspace snapshot and runner script to remote Windows host via scp -F...");
    const scpArchiveRes = await deps.runCommand("scp", buildScpArgs(contract, localArchive, remoteArchive), true);
    if (scpArchiveRes.code !== 0) {
      return { status: "failed", exitCode: scpArchiveRes.code };
    }

    const scpScriptRes = await deps.runCommand("scp", buildScpArgs(contract, localScript, remoteScript), true);
    if (scpScriptRes.code !== 0) {
      return { status: "failed", exitCode: scpScriptRes.code };
    }

    logger.log("Executing Windows test suite on remote host via ssh -F (cmd.exe)...");
    const sshRes = await deps.runCommand("ssh", buildSshArgs(contract, `cmd /c "${remoteScript}"`), true);
    if (sshRes.code !== 0) {
      return { status: "failed", exitCode: sshRes.code };
    }

    return { status: "passed", exitCode: 0 };
  } finally {
    if (!opts.keepRemote) {
      const cleanupCmd = buildRemoteCleanupCommand(remoteDir, remoteArchive, remoteScript);
      await deps.runCommand("ssh", buildSshArgs(contract, cleanupCmd), false);
    } else {
      logger.log(`Keeping remote working directory: ${remoteDir}`);
    }
    deps.removePath(localTempDir);
  }
}

export async function defaultRunCommand(
  cmd: string,
  args: string[],
  inheritStdio = false,
): Promise<CommandResult> {
  const command = new Deno.Command(cmd, {
    args,
    stdout: inheritStdio ? "inherit" : "piped",
    stderr: inheritStdio ? "inherit" : "piped",
  });
  const output = await command.output();
  return {
    code: output.code,
    stdout: inheritStdio ? "" : new TextDecoder().decode(output.stdout),
    stderr: inheritStdio ? "" : new TextDecoder().decode(output.stderr),
  };
}

const EXCLUDED_ARCHIVE_PREFIXES = ["bin/", "extra-bin/", "target/", "coverage/", "cache/"];

export function filterArchivePaths(paths: string[], fileExists: (p: string) => boolean = existsSync): string[] {
  return paths.filter((entry) => {
    if (!entry) return false;
    if (EXCLUDED_ARCHIVE_PREFIXES.some((prefix) => entry.startsWith(prefix))) {
      return false;
    }
    return fileExists(entry);
  });
}

export async function defaultCreateWorkspaceArchive(archivePath: string): Promise<void> {
  const gitRes = await defaultRunCommand("git", ["ls-files", "-co", "--exclude-standard", "-z"], false);
  if (gitRes.code !== 0) {
    throw new Error(`Failed to list workspace files via git ls-files: ${gitRes.stderr.trim()}`);
  }

  const files = filterArchivePaths(gitRes.stdout.split("\0"));
  if (files.length === 0) {
    throw new Error("No workspace files found to package.");
  }

  const listFile = `${archivePath}.files`;
  try {
    Deno.writeTextFileSync(listFile, files.join("\0"));
    const tarRes = await defaultRunCommand("tar", ["-czf", archivePath, "--null", "-T", listFile], false);
    if (tarRes.code !== 0) {
      throw new Error(`Failed to create workspace archive via tar: ${tarRes.stderr.trim()}`);
    }
  } finally {
    try {
      Deno.removeSync(listFile);
    } catch {
      // ignore cleanup error
    }
  }
}

export function createDefaultDeps(): RunnerDeps {
  return {
    getEnv: (name: string) => Deno.env.get(name),
    fileExists: existsSync,
    os: Deno.build.os,
    runCommand: defaultRunCommand,
    createWorkspaceArchive: defaultCreateWorkspaceArchive,
    makeTempDir: () => Deno.makeTempDirSync({ prefix: "levain-win-ssh-" }),
    writeTextFile: (filePath: string, content: string) => Deno.writeTextFileSync(filePath, content),
    removePath: (targetPath: string) => {
      try {
        Deno.removeSync(targetPath, { recursive: true });
      } catch {
        // ignore cleanup error
      }
    },
    generateRunId: () => new Date().toISOString().replace(/[:.TZ-]/g, "").slice(0, 14),
    logger: console,
  };
}

export async function main() {
  const envDenoVersion = Deno.env.get("LEVAIN_TEST_DENO_VERSION")?.trim() || DEFAULT_DENO_VERSION;
  const opts = parseArgs(Deno.args, envDenoVersion);
  const result = await runWindowsTests(opts, createDefaultDeps());
  Deno.exit(result.exitCode);
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("Unexpected error:", err instanceof Error ? err.message : String(err));
    Deno.exit(1);
  });
}
