import * as path from "@std/path";

import t from "./i18n.ts";
import OsUtils from "./os/os_utils.ts";

const ALLOWED_LEVAIN_YAML_KEYS = new Set([
  "levain",
  "levain.minVersion",
  "levain.pkg.skipInstallDir",
  "levain.pkg.skipRegistry",
  "levain.preserveBaseDirOnUpdate",
  "levain.config.noBaseDir",
]);

const DEFAULT_VAR_PREFIX = "levain.var.default.";

/**
 * Canonicalizes the `levain.var.default.` prefix to lowercase when written in mixed case
 * so default variables can be looked up reliably regardless of how the prefix was cased.
 */
export function canonicalizeVarName(name: string): string {
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith(DEFAULT_VAR_PREFIX) && trimmed.length > DEFAULT_VAR_PREFIX.length) {
    return `${DEFAULT_VAR_PREFIX}${trimmed.slice(DEFAULT_VAR_PREFIX.length)}`;
  }
  return name;
}

/**
 * Returns true if `name` uses a reserved Levain environment variable prefix
 * (`levain_*`, `_levain_*`, `__levain_*`, case-insensitive).
 */
export function isReservedEnvPrefix(name: string): boolean {
  const lower = name.trim().toLowerCase();
  return (
    lower.startsWith("levain_") ||
    lower.startsWith("_levain_") ||
    lower.startsWith("__levain_")
  );
}

function isPathInsideDir(filePath: string, dirPath: string): boolean {
  const resolvedFile = path.resolve(filePath);
  const resolvedDir = path.resolve(dirPath);
  const cmpFile = OsUtils.isWindows() ? resolvedFile.toLowerCase() : resolvedFile;
  const cmpDir = OsUtils.isWindows() ? resolvedDir.toLowerCase() : resolvedDir;
  const rel = path.relative(cmpDir, cmpFile);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/**
 * Returns true if `name` is the reserved engine package name (`levain`, case-insensitive).
 */
export function isReservedPackageName(name: string): boolean {
  return name.trim().toLowerCase() === "levain";
}

/**
 * Returns true if `name` is reserved for Levain engine variables and cannot be written
 * by recipe actions such as `setVar`, `jsonGet --setVar`, `propertyGet --setVar`,
 * `inspect --saveVar`, `checkChainDirExists --saveVar`, or `levainShell --saveVar`.
 *
 * Matching is strictly case-insensitive (`levain`, `LEVAIN`, `LeVaIN`, `LeVaIn.*`, etc.).
 * Explicit `levain.var.default.<name>` keys remain allowed for recipe default variables.
 */
export function isReservedVarName(name: string): boolean {
  const lower = name.trim().toLowerCase();
  if (!lower) {
    return false;
  }
  if (lower.startsWith(DEFAULT_VAR_PREFIX)) {
    const target = lower.slice(DEFAULT_VAR_PREFIX.length);
    return target.length === 0 || isReservedEnvVarName(target);
  }
  return (
    lower === "levain" ||
    lower.startsWith("levain.") ||
    lower === "levainhome" ||
    lower === "levaincache" ||
    isReservedEnvPrefix(lower)
  );
}

/**
 * Returns true if `name` is reserved for Levain engine environment variables and cannot
 * be written via `setEnv` (session or permanent). Matching is strictly case-insensitive.
 */
export function isReservedEnvVarName(name: string): boolean {
  const lower = name.trim().toLowerCase();
  if (!lower) {
    return false;
  }
  return (
    lower === "levain" ||
    lower.startsWith("levain.") ||
    lower === "levainhome" ||
    lower === "levaincache" ||
    isReservedEnvPrefix(lower)
  );
}

/**
 * Returns true if a top-level recipe YAML key matches an official Levain directive (exact case).
 */
export function isAllowedLevainYamlKey(key: string): boolean {
  const trimmed = key.trim();
  if (ALLOWED_LEVAIN_YAML_KEYS.has(trimmed)) {
    return true;
  }
  if (trimmed.startsWith(DEFAULT_VAR_PREFIX)) {
    const target = trimmed.slice(DEFAULT_VAR_PREFIX.length);
    return target.length > 0 && !isReservedEnvVarName(target);
  }
  return false;
}

/**
 * Returns true if a top-level recipe YAML key uses the reserved `levain` namespace
 * (`levain`, `levain.*`, `levainHome`, `levainCache`, `levain_*`, `_levain_*`, `__levain_*`,
 * case-insensitive) outside the official allowlist.
 */
export function isUnknownReservedYamlKey(key: string): boolean {
  const trimmed = key.trim();
  const lower = trimmed.toLowerCase();
  if (
    lower !== "levain" &&
    lower !== "levainhome" &&
    lower !== "levaincache" &&
    !lower.startsWith("levain.") &&
    !isReservedEnvPrefix(lower)
  ) {
    return false;
  }
  return !isAllowedLevainYamlKey(trimmed);
}

export function assertNotReservedVarName(name: string, actionName: string): void {
  if (isReservedVarName(name)) {
    throw new Error(t("lib.reserved_words.varNotAllowed", { name, action: actionName }));
  }
}

export function assertNotReservedEnvVarName(name: string, actionName: string): void {
  if (isReservedEnvVarName(name)) {
    throw new Error(t("lib.reserved_words.envNotAllowed", { name, action: actionName }));
  }
}

export function assertAllowedPackageName(name: string, yamlFile: string, allowedDirs: string[]): void {
  if (!isReservedPackageName(name)) {
    return;
  }
  const isAllowedLocation = allowedDirs.some((dir) => Boolean(dir) && isPathInsideDir(yamlFile, dir));
  if (!isAllowedLocation) {
    throw new Error(t("lib.reserved_words.packageNotAllowed", { name, file: yamlFile }));
  }
}
