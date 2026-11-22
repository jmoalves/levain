#!/usr/bin/env -S deno run --allow-all
/**
 * scripts/integrate.ts
 * Fast-Fail local integration runner for Levain (Deno 2).
 * Designed for low resource usage, zero AI lock-in, and concise error diagnostics.
 */
import { existsSync } from "@std/fs";

export const EN_LOCALE_PATH = "src/locales/en/translation.json";
export const PT_LOCALE_PATH = "src/locales/pt/translation.json";

export interface Options {
  quick: boolean;
  verbose: boolean;
  checkI18nOnly: boolean;
}

export interface I18nValidationResult {
  valid: boolean;
  errors: string[];
}

export function parseArgs(args: string[]): Options {
  return {
    quick: args.includes("--quick"),
    verbose: args.includes("--verbose") || args.includes("-v"),
    checkI18nOnly: args.includes("--check-i18n"),
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
    args: ["status", "--porcelain", "-uall"],
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

function flattenCatalog(
  node: unknown,
  prefix: string,
  entries: Map<string, string>,
  errors: string[],
  localeLabel: string,
): void {
  if (typeof node !== "object" || node === null || Array.isArray(node)) {
    errors.push(`[${localeLabel}] Expected object at '${prefix || "<root>"}'.`);
    return;
  }

  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key.includes(".")) {
      errors.push(`[${localeLabel}] Key '${key}' under '${prefix || "<root>"}' contains a literal '.' (likely mis-nested).`);
    }
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      entries.set(fullKey, value);
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      flattenCatalog(value, fullKey, entries, errors, localeLabel);
    } else {
      errors.push(`[${localeLabel}] Unsupported value type at '${fullKey}'.`);
    }
  }
}

function extractPlaceholders(value: string, fullKey: string, localeLabel: string, errors: string[]): string[] {
  if (/\$\{[^}]+\}/.test(value)) {
    errors.push(`[${localeLabel}] Key '${fullKey}' uses JS template syntax '\${...}' instead of i18next '{{...}}'.`);
  }

  const stripped = value.replace(/\{\{\s*-?\s*([a-zA-Z0-9_]+)\s*\}\}/g, "");
  if (stripped.includes("{{") || stripped.includes("}}")) {
    errors.push(`[${localeLabel}] Key '${fullKey}' contains malformed '{{...}}' placeholder syntax.`);
  }

  const vars = new Set<string>();
  for (const match of value.matchAll(/\{\{\s*-?\s*([a-zA-Z0-9_]+)\s*\}\}/g)) {
    vars.add(match[1]);
  }
  return Array.from(vars).sort();
}

export function validateI18nCatalogs(enJsonText: string, ptJsonText: string): I18nValidationResult {
  const errors: string[] = [];

  let enObj: unknown;
  let ptObj: unknown;

  try {
    enObj = JSON.parse(enJsonText);
  } catch (err) {
    errors.push(`[en] Invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    ptObj = JSON.parse(ptJsonText);
  } catch (err) {
    errors.push(`[pt] Invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const enEntries = new Map<string, string>();
  const ptEntries = new Map<string, string>();
  flattenCatalog(enObj, "", enEntries, errors, "en");
  flattenCatalog(ptObj, "", ptEntries, errors, "pt");

  for (const key of enEntries.keys()) {
    if (!ptEntries.has(key)) {
      errors.push(`[pt] Missing translation key '${key}' (present in en).`);
    }
  }
  for (const key of ptEntries.keys()) {
    if (!enEntries.has(key)) {
      errors.push(`[en] Missing translation key '${key}' (present in pt).`);
    }
  }

  for (const [key, enVal] of enEntries.entries()) {
    const enVars = extractPlaceholders(enVal, key, "en", errors);
    const ptVal = ptEntries.get(key);
    if (ptVal === undefined) continue;

    const ptVars = extractPlaceholders(ptVal, key, "pt", errors);
    if (enVars.join(",") !== ptVars.join(",")) {
      errors.push(
        `[i18n] Placeholder mismatch at '${key}': en=[${enVars.join(", ")}] vs pt=[${ptVars.join(", ")}].`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

export function defaultValidateI18n(): I18nValidationResult {
  const enText = Deno.readTextFileSync(EN_LOCALE_PATH);
  const ptText = Deno.readTextFileSync(PT_LOCALE_PATH);
  return validateI18nCatalogs(enText, ptText);
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
  validateI18n?: () => I18nValidationResult;
  fileExists?: (path: string) => boolean;
  os?: string;
  logger?: Logger;
}

export async function runCascade(
  opts: Options,
  deps: IntegrateDeps,
): Promise<{ success: boolean; failedLevel?: number; message?: string }> {
  const log = deps.logger?.log ?? console.log;
  const error = deps.logger?.error ?? console.error;
  const fileExists = deps.fileExists ?? existsSync;
  const validateI18n = deps.validateI18n ?? defaultValidateI18n;
  const os = deps.os ?? Deno.build.os;

  const { allChanged, tsChanged } = await deps.getChangedFiles();

  log(`📁 Detected ${allChanged.length} modified/staged file(s) (${tsChanged.length} TypeScript file(s)).`);

  // LEVEL 1: Static Checks (Type Checking + Lint + i18n Catalog Validation)
  const existingTsChanged = tsChanged.filter((file) => fileExists(file));

  if (existingTsChanged.length > 0) {
    const filesToCheck = getFilesToCheck(existingTsChanged);

    const checkRes = await deps.runDenoCommand(
      `Level 1a: Type Checking (${filesToCheck.length} file(s))`,
      ["check", ...filesToCheck],
    );

    if (!checkRes.success) {
      error("💥 Aborting: Fix TypeScript errors before running tests.");
      return { success: false, failedLevel: 1, message: "Fix TypeScript errors before running tests." };
    }

    const lintRes = await deps.runDenoCommand(
      `Level 1b: Lint (${existingTsChanged.length} file(s))`,
      ["lint", ...existingTsChanged],
    );

    if (!lintRes.success) {
      error("💥 Aborting: Fix lint issues before running tests.");
      return { success: false, failedLevel: 1, message: "Fix lint issues before running tests." };
    }
  } else {
    log("⏩ Level 1a/1b: Skipped typecheck & lint (no existing modified TypeScript files detected).");
  }

  const i18nRes = validateI18n();
  if (!i18nRes.valid) {
    error("❌ Level 1c: i18n Catalog Validation - FAILED");
    for (const msg of i18nRes.errors) {
      error(`   - ${msg}`);
    }
    error("💥 Aborting: Fix i18n catalog errors before running tests.");
    return { success: false, failedLevel: 1, message: "Fix i18n catalog errors before running tests." };
  }
  log("✔ Level 1c: i18n Catalog Validation - PASSED");

  // LEVEL 2: Targeted Tests (Affected tests only)
  const targetedTests = getTargetedTests(existingTsChanged, fileExists);

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

  if (os !== "windows") {
    log(
      `\n⚠️  Platform notice: running on '${os}' skips Windows-only tests. ` +
        `Validate Windows changes with 'deno task test:windows' (see AGENTS.md and testing/WINDOWS.md).`,
    );
  }

  log("\n✨ [levain-integrate] All checks passed successfully! Ready for commit.");
  return { success: true };
}

export async function main() {
  const opts = parseArgs(Deno.args);

  if (opts.checkI18nOnly) {
    const i18nRes = defaultValidateI18n();
    if (!i18nRes.valid) {
      console.error("❌ i18n Catalog Validation - FAILED");
      for (const msg of i18nRes.errors) {
        console.error(`   - ${msg}`);
      }
      Deno.exit(1);
    }
    console.log("✔ i18n Catalog Validation - PASSED");
    return;
  }

  console.log("🚀 [levain-integrate] Starting fast-fail integration cascade...\n");

  const result = await runCascade(opts, {
    getChangedFiles: defaultGetChangedFiles,
    runDenoCommand: defaultRunDenoCommand,
    validateI18n: defaultValidateI18n,
    fileExists: existsSync,
    os: Deno.build.os,
    logger: console,
  });

  if (!result.success) {
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("Unexpected error:", err instanceof Error ? err.message : String(err));
    Deno.exit(1);
  });
}
