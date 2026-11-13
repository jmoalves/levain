#!/usr/bin/env -S deno run --allow-all
/**
 * scripts/integrate.ts
 * Fast-Fail local integration runner for Levain (Deno 2).
 * Designed for low resource usage, zero AI lock-in, and concise error diagnostics.
 */
import { existsSync } from "@std/fs";

export interface Options {
  quick: boolean;
  verbose: boolean;
}

export function parseArgs(args: string[]): Options {
  return {
    quick: args.includes("--quick"),
    verbose: args.includes("--verbose") || args.includes("-v"),
  };
}

// 1. Detect modified files via git status
export function parseGitStatusOutput(output: string): { allChanged: string[]; tsChanged: string[] } {
  const lines = output.split("\n").filter((l) => l.trim().length > 0);
  const allChanged: string[] = [];
  const tsChanged: string[] = [];

  for (const line of lines) {
    const rawPath = line.substring(3).trim();
    const cleanPath = rawPath.includes("->") ? rawPath.split("->")[1].trim() : rawPath;
    allChanged.push(cleanPath);

    if (cleanPath.endsWith(".ts") && !cleanPath.includes("testdata/")) {
      tsChanged.push(cleanPath);
    }
  }

  return { allChanged, tsChanged };
}

export async function defaultGetChangedFiles(): Promise<{ allChanged: string[]; tsChanged: string[] }> {
  const cmd = new Deno.Command("git", {
    args: ["status", "--porcelain"],
    stdout: "piped",
    stderr: "piped",
  });
  const { stdout, code } = await cmd.output();
  if (code !== 0) {
    throw new Error("Failed to execute git status. Ensure git is installed and repository is valid.");
  }

  const output = new TextDecoder().decode(stdout);
  return parseGitStatusOutput(output);
}

export function getFilesToCheck(tsChanged: string[]): string[] {
  if (tsChanged.length === 0) return [];
  return tsChanged.some((f) => f === "levain.ts" || f.startsWith("src/levain"))
    ? ["levain.ts"]
    : tsChanged;
}

export function getTargetedTests(
  tsChanged: string[],
  fileExists: (path: string) => boolean = existsSync,
): string[] {
  const targetedTests = new Set<string>();
  for (const file of tsChanged) {
    if (file.endsWith(".test.ts")) {
      if (fileExists(file)) targetedTests.add(file);
    } else if (file.endsWith(".ts")) {
      const candidate = file.replace(/\.ts$/, ".test.ts");
      if (fileExists(candidate)) {
        targetedTests.add(candidate);
      }
    }
  }
  return Array.from(targetedTests);
}

// 2. Helper to run a Deno command and display clean feedback
export async function defaultRunDenoCommand(
  title: string,
  commandArgs: string[],
): Promise<{ success: boolean; durationMs: number }> {
  const start = performance.now();
  console.log(`⏳ ${title}...`);

  const cmd = new Deno.Command(Deno.execPath(), {
    args: commandArgs,
    stdout: "piped",
    stderr: "piped",
  });

  const process = await cmd.output();
  const durationMs = Math.round(performance.now() - start);

  if (process.code === 0) {
    console.log(`✔ ${title} - PASSED (${durationMs}ms)`);
    return { success: true, durationMs };
  }

  console.error(`\n❌ ${title} - FAILED (${durationMs}ms)`);
  console.error("--------------------------------------------------");
  const stderr = new TextDecoder().decode(process.stderr).trim();
  const stdout = new TextDecoder().decode(process.stdout).trim();
  if (stderr) console.error(stderr);
  if (stdout) console.error(stdout);
  console.error("--------------------------------------------------\n");
  return { success: false, durationMs };
}

export interface Logger {
  log: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export interface IntegrateDeps {
  getChangedFiles: () => Promise<{ allChanged: string[]; tsChanged: string[] }>;
  runDenoCommand: (
    title: string,
    commandArgs: string[],
  ) => Promise<{ success: boolean; durationMs: number }>;
  fileExists?: (path: string) => boolean;
  logger?: Logger;
}

export async function runCascade(
  opts: Options,
  deps: IntegrateDeps,
): Promise<{ success: boolean; failedLevel?: number; message?: string }> {
  const log = deps.logger?.log ?? console.log;
  const error = deps.logger?.error ?? console.error;
  const fileExists = deps.fileExists ?? existsSync;

  const { allChanged, tsChanged } = await deps.getChangedFiles();

  log(`📁 Detected ${allChanged.length} modified/staged file(s) (${tsChanged.length} TypeScript file(s)).`);

  // LEVEL 1: Static Type Checking
  if (tsChanged.length > 0) {
    const filesToCheck = getFilesToCheck(tsChanged);

    const checkRes = await deps.runDenoCommand(
      `Level 1: Type Checking (${filesToCheck.length} file(s))`,
      ["check", ...filesToCheck],
    );

    if (!checkRes.success) {
      error("💥 Aborting: Fix TypeScript errors before running tests.");
      return { success: false, failedLevel: 1, message: "Fix TypeScript errors before running tests." };
    }
  } else {
    log("⏩ Level 1: Skipped (no TypeScript changes detected).");
  }

  // LEVEL 2: Targeted Tests (Affected tests only)
  const targetedTests = getTargetedTests(tsChanged, fileExists);

  if (targetedTests.length > 0) {
    const testRes = await deps.runDenoCommand(
      `Level 2: Targeted Tests (${targetedTests.length} test file(s))`,
      ["test", "--allow-all", ...targetedTests],
    );

    if (!testRes.success) {
      error("💥 Aborting: Targeted tests failed. Fix failing tests first.");
      return { success: false, failedLevel: 2, message: "Targeted tests failed. Fix failing tests first." };
    }
  } else {
    log("⏩ Level 2: Skipped (no direct test files mapped to modified code).");
  }

  // LEVEL 3: Full Test Suite
  if (opts.quick) {
    log("\n⚡ [Quick Mode] Skipping Level 3 full test suite.");
  } else {
    const fullRes = await deps.runDenoCommand(
      "Level 3: Full Parallel Test Suite (deno test --allow-all --parallel --fail-fast)",
      ["test", "--allow-all", "--parallel", "--fail-fast"],
    );

    if (!fullRes.success) {
      error("💥 Aborting: Full test suite failed.");
      return { success: false, failedLevel: 3, message: "Full test suite failed." };
    }
  }

  log("\n✨ [levain-integrate] All checks passed successfully! Ready for commit.");
  return { success: true };
}

export async function main() {
  const opts = parseArgs(Deno.args);
  console.log("🚀 [levain-integrate] Starting fast-fail integration cascade...\n");

  const result = await runCascade(opts, {
    getChangedFiles: defaultGetChangedFiles,
    runDenoCommand: defaultRunDenoCommand,
    fileExists: existsSync,
    logger: console,
  });

  if (!result.success) {
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("Unexpected error:", err.message);
    Deno.exit(1);
  });
}
