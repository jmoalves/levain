import * as path from "@std/path";

import type Config from "../config.ts";
import { FileUtils } from "../fs/file_utils.ts";
import t from "../i18n.ts";
import OsUtils from "../os/os_utils.ts";
import type Package from "../package/package.ts";
import { findDefinedActionPlatforms, resolvePackageActions } from "../package/package_actions.ts";
import { parseArgs, tokenizeArgs } from "../parse_args.ts";
import HomePaths from "../paths/home_paths.ts";
import type { PlaybookVarResolver } from "./playbook_resolver.ts";

export interface PackageUninstallPlan {
  readonly pkg: Package;
  readonly steps: string[];
  readonly manualReview: string[];
  readonly otherOsOnly: string[];
}

interface ActivateInitTarget {
  readonly cmd: boolean;
  readonly bash: boolean;
  readonly powershell: boolean;
  readonly powershellProfile?: string;
  readonly cmder: boolean;
  readonly cmderConfig?: string;
}

function resolveMaybePath(baseDir: string | undefined, value: string): string {
  if (!value || value.includes("<") || !FileUtils.isFileSystemUrl(value)) {
    return value;
  }
  return baseDir ? path.resolve(baseDir, value) : path.resolve(value);
}

function normalizeAbsolutePath(value: string): string {
  if (!value || value.includes("<") || !FileUtils.isFileSystemUrl(value)) {
    return value;
  }
  return path.isAbsolute(value) ? path.normalize(value) : value;
}

function isInsideDir(targetPath: string, rootDir: string): boolean {
  if (!targetPath || !rootDir || targetPath.includes("<") || !FileUtils.isFileSystemUrl(targetPath)) {
    return false;
  }
  const normRoot = path.resolve(rootDir);
  const normTarget = path.resolve(targetPath);
  const compareRoot = OsUtils.isWindows() ? normRoot.toLowerCase() : normRoot;
  const compareTarget = OsUtils.isWindows() ? normTarget.toLowerCase() : normTarget;
  const rel = path.relative(compareRoot, compareTarget);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function isInsidePackageBaseDir(targetPath: string, pkg: Package): boolean {
  if (pkg.skipInstallDir()) {
    return false;
  }
  return isInsideDir(targetPath, pkg.baseDir);
}

function escapePowerShellSingleQuoted(value: string): string {
  return value.replace(/['\u2018\u2019\u201a\u201b]/g, "$&$&");
}

function escapePosixSingleQuoted(value: string): string {
  return value.replaceAll("'", "'\\''");
}

function escapeDoubleQuoted(value: string): string {
  return value.replaceAll('"', '\\"');
}

function quoteShellArg(arg: string): string {
  if (/\s/.test(arg) && !(arg.startsWith('"') && arg.endsWith('"'))) {
    return `"${escapeDoubleQuoted(arg)}"`;
  }
  return arg;
}

function removeDirCommand(dir: string): string {
  if (OsUtils.isWindows()) {
    const escaped = escapePowerShellSingleQuoted(dir);
    return `if (Test-Path -LiteralPath '${escaped}') { Remove-Item -LiteralPath '${escaped}' -Recurse -Force }`;
  }
  return `rm -rf '${escapePosixSingleQuoted(dir)}'`;
}

function removeFileCommand(filePath: string): string {
  if (OsUtils.isWindows()) {
    const escaped = escapePowerShellSingleQuoted(filePath);
    return `if (Test-Path -LiteralPath '${escaped}') { Remove-Item -LiteralPath '${escaped}' -Force }`;
  }
  return `rm -f '${escapePosixSingleQuoted(filePath)}'`;
}

function removePermanentEnvCommand(key: string): string {
  const escaped = escapePowerShellSingleQuoted(key);
  return `[Environment]::SetEnvironmentVariable('${escaped}', $null, 'User')`;
}

function removePermanentPathCommand(dir: string): string {
  const escaped = escapePowerShellSingleQuoted(dir);
  return (
    `$k=[Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Environment',$true); ` +
    `if ($k) { try { $v=$k.GetValue('Path',$null,[Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames); ` +
    `if ($null -ne $v) { $p=($v -split ';') | Where-Object { $_ -and $_.TrimEnd('\\') -ine '${escaped}'.TrimEnd('\\') }; ` +
    `$k.SetValue('Path',($p -join ';'),$k.GetValueKind('Path')) } } finally { $k.Dispose() } }`
  );
}

function shortcutPathFor(location: "desktop" | "startMenu" | "startup", target: string, folder?: string): string {
  const baseName = path.basename(target);
  const fileName = OsUtils.isWindows() ? `${baseName}.lnk` : baseName;
  try {
    switch (location) {
      case "desktop":
        return path.join(HomePaths.desktopDir, fileName);
      case "startMenu":
        return folder
          ? path.join(HomePaths.startMenuDir, folder, fileName)
          : path.join(HomePaths.startMenuDir, fileName);
      case "startup":
        return path.join(HomePaths.startupDir, fileName);
    }
  } catch {
    return fileName;
  }
}

/**
 * Orders packages in reverse dependency order so dependents are uninstalled before
 * the packages they rely on, and places the `levain` engine package last if present.
 */
export function orderPackagesForUninstall(packages: Package[]): Package[] {
  const byName = new Map<string, Package>();
  for (const pkg of packages) {
    byName.set(pkg.name, pkg);
  }

  const visited = new Set<string>();
  const visiting = new Set<string>();
  const topoInstallOrder: Package[] = [];

  const visit = (pkg: Package) => {
    if (visited.has(pkg.name) || visiting.has(pkg.name)) {
      return;
    }
    visiting.add(pkg.name);
    for (const depName of pkg.dependencies ?? []) {
      const depPkg = byName.get(depName);
      if (depPkg) {
        visit(depPkg);
      }
    }
    visiting.delete(pkg.name);
    visited.add(pkg.name);
    topoInstallOrder.push(pkg);
  };

  // Deterministic input order before DFS
  const sortedInput = [...packages].sort((a, b) => a.name.localeCompare(b.name));
  for (const pkg of sortedInput) {
    visit(pkg);
  }

  const reversed = [...topoInstallOrder].reverse();
  const nonLevain = reversed.filter((pkg) => pkg.name !== "levain");
  const levainPkg = reversed.find((pkg) => pkg.name === "levain");
  return levainPkg ? [...nonLevain, levainPkg] : nonLevain;
}

/**
 * Finds installed packages outside `targetNames` that directly depend on any package in `targetNames`.
 */
export function findInstalledDependents(
  installedPackages: Package[],
  targetNames: Set<string>,
): Map<string, string[]> {
  const dependents = new Map<string, string[]>();
  for (const installed of installedPackages) {
    if (targetNames.has(installed.name)) {
      continue;
    }
    for (const dep of installed.dependencies ?? []) {
      if (targetNames.has(dep)) {
        const list = dependents.get(dep) ?? [];
        list.push(installed.name);
        dependents.set(dep, list);
      }
    }
  }
  for (const [key, list] of dependents.entries()) {
    dependents.set(key, [...new Set(list)].sort());
  }
  return dependents;
}

/**
 * Translates a package's recipe actions into concrete, safe manual uninstall steps.
 */
export function buildPackageUninstallPlan(
  pkg: Package,
  config: Config,
  resolver: PlaybookVarResolver,
  options: { fullCleanup: boolean },
): PackageUninstallPlan {
  const installActions = resolvePackageActions(pkg, "cmd.install");
  const envActions = resolvePackageActions(pkg, "cmd.env");
  const shellActions = resolvePackageActions(pkg, "cmd.shell");

  const otherOsOnly = installActions.length === 0 && envActions.length === 0 && shellActions.length === 0
    ? findDefinedActionPlatforms(pkg, ["cmd.install", "cmd.shell", "cmd.env"])
    : [];

  const permanentPaths = new Set<string>();
  const permanentEnvVars = new Set<string>();
  const contextMenus = new Map<string, { id: string; name?: string }>();
  const shortcuts = new Set<string>();
  const externalMkdirs = new Set<string>();
  const externalClones = new Set<string>();
  const externalFiles = new Set<string>();
  const manualReviewSet = new Set<string>();
  const activateTargets: ActivateInitTarget[] = [];

  const processLine = (rawLine: string, stage: "install" | "env") => {
    const tokens = tokenizeArgs(rawLine);
    const action = tokens.shift() ?? "";
    if (!action) return;

    const args = tokens.map((token) => resolver.resolve(token, pkg));

    try {
      switch (action) {
        case "setVar": {
          if (args.length >= 2) {
            resolver.setScopedVar(args[0], args[1]);
          }
          break;
        }

        case "setEnv": {
          const parsed = parseArgs(args, { boolean: ["permanent"] });
          if (parsed._.length >= 2) {
            const [key, value] = parsed._;
            resolver.setScopedVar(key, value);
            if (parsed.permanent) {
              permanentEnvVars.add(key);
            }
          }
          break;
        }

        case "addPath": {
          const parsed = parseArgs(args, { boolean: ["permanent"], stopEarly: false });
          const rawDir = parsed._[0];
          if (rawDir && parsed.permanent) {
            permanentPaths.add(resolveMaybePath(pkg.baseDir, rawDir));
          }
          break;
        }

        case "mkdir": {
          const parsed = parseArgs(args, { boolean: ["compact"], stopEarly: false });
          const target = parsed._[0];
          if (target) {
            const dir = resolveMaybePath(pkg.baseDir, target);
            if (!isInsidePackageBaseDir(dir, pkg)) {
              externalMkdirs.add(dir);
            }
          }
          break;
        }

        case "clone": {
          const parsed = parseArgs(args, {});
          if (parsed._.length >= 2) {
            const dst = resolveMaybePath(pkg.baseDir, parsed._[1]);
            if (!isInsidePackageBaseDir(dst, pkg)) {
              externalClones.add(dst);
            }
          }
          break;
        }

        case "copy": {
          const parsed = parseArgs(args, { boolean: ["verbose", "strip", "ifNotExists"], stopEarly: false });
          if (parsed._.length >= 2) {
            const dst = resolveMaybePath(pkg.baseDir, parsed._[parsed._.length - 1]);
            if (!isInsidePackageBaseDir(dst, pkg)) {
              externalFiles.add(dst);
            }
          }
          break;
        }

        case "extract": {
          const parsed = parseArgs(args, { boolean: ["strip"], stringOnce: ["type"], stopEarly: false });
          if (parsed._.length >= 2) {
            const dst = resolveMaybePath(pkg.baseDir, parsed._[1]);
            if (!isInsidePackageBaseDir(dst, pkg)) {
              externalFiles.add(dst);
            }
          }
          break;
        }

        case "mavenCopy": {
          const parsed = parseArgs(args, { boolean: ["ifNotExists"], stopEarly: false });
          if (parsed._.length >= 2) {
            const dst = resolveMaybePath(pkg.baseDir, parsed._[1]);
            if (!isInsidePackageBaseDir(dst, pkg)) {
              externalFiles.add(dst);
            }
          }
          break;
        }

        case "template": {
          const parsed = parseArgs(args, {
            stringMany: ["replace", "with"],
            boolean: ["doubleBackslash"],
          });
          if (parsed._.length >= 2) {
            const dst = resolveMaybePath(pkg.baseDir, parsed._[1]);
            if (!isInsidePackageBaseDir(dst, pkg)) {
              externalFiles.add(dst);
            }
          }
          break;
        }

        case "jsonSet": {
          const parsed = parseArgs(args, { boolean: ["ifNotExists"] });
          if (parsed._.length >= 3) {
            const file = normalizeAbsolutePath(parsed._[0]);
            if (!isInsidePackageBaseDir(file, pkg)) {
              manualReviewSet.add(
                t("cmd.explain.uninstall.reviewJsonSet", { file, property: parsed._[1] }),
              );
            }
          }
          break;
        }

        case "propertySet": {
          const parsed = parseArgs(args, { boolean: ["ifNotExists"] });
          if (parsed._.length >= 3) {
            const file = normalizeAbsolutePath(parsed._[0]);
            if (!isInsidePackageBaseDir(file, pkg)) {
              manualReviewSet.add(
                t("cmd.explain.uninstall.reviewPropertySet", { file, property: parsed._[1] }),
              );
            }
          }
          break;
        }

        case "backupFile": {
          const rawFile = args[0];
          if (rawFile) {
            const file = normalizeAbsolutePath(rawFile);
            if (!isInsidePackageBaseDir(file, pkg)) {
              manualReviewSet.add(t("cmd.explain.uninstall.reviewBackupFile", { file }));
            }
          }
          break;
        }

        case "jsonGet":
        case "propertyGet": {
          const parsed = parseArgs(args, { stringOnce: ["setVar", "default"], stopEarly: false });
          if (parsed.setVar) resolver.markRuntimeVar(parsed.setVar);
          break;
        }

        case "checkChainDirExists": {
          const parsed = parseArgs(args, { stringOnce: ["saveVar", "default"], stopEarly: false });
          if (parsed.saveVar) resolver.markRuntimeVar(parsed.saveVar);
          break;
        }

        case "inspect": {
          const parsed = parseArgs(args, { stringMany: ["regExp", "saveVar"], stopEarly: false });
          for (const v of parsed.saveVar ?? []) {
            resolver.markRuntimeVar(v);
          }
          break;
        }

        case "addToDesktop": {
          if (args[0]) {
            shortcuts.add(shortcutPathFor("desktop", normalizeAbsolutePath(args[0])));
          }
          break;
        }

        case "addToStartMenu": {
          if (args[0]) {
            shortcuts.add(shortcutPathFor("startMenu", normalizeAbsolutePath(args[0]), args[1]));
          }
          break;
        }

        case "addToStartup": {
          if (args[0]) {
            shortcuts.add(shortcutPathFor("startup", normalizeAbsolutePath(args[0])));
          }
          break;
        }

        case "contextMenu": {
          const rest = args[0] === "folders" ? args.slice(1) : args;
          const parsed = parseArgs(rest, { stringOnce: ["id", "name", "cmd", "icon"], stopEarly: false });
          if (parsed.id) {
            contextMenus.set(parsed.id, { id: parsed.id, name: parsed.name });
          }
          break;
        }

        case "contextMenuRemove": {
          const rest = args[0] === "folders" ? args.slice(1) : args;
          const parsed = parseArgs(rest, { stringOnce: ["id"], stopEarly: false });
          if (parsed.id) {
            contextMenus.delete(parsed.id);
          }
          break;
        }

        case "activateInit": {
          const parsed = parseArgs(args, {
            boolean: ["dev", "cmd", "bash", "powershell", "cmder"],
            stringOnce: ["powershell-profile", "cmder-config"],
            stopEarly: false,
          });
          const wantPowershell = Boolean(parsed.powershell || parsed["powershell-profile"]);
          const wantCmder = Boolean(parsed.cmder || parsed["cmder-config"]);
          const hasExplicit = Boolean(parsed.cmd || parsed.bash || wantPowershell || wantCmder);
          activateTargets.push({
            cmd: hasExplicit ? Boolean(parsed.cmd) : OsUtils.isWindows(),
            bash: hasExplicit ? Boolean(parsed.bash) : true,
            powershell: hasExplicit ? wantPowershell : OsUtils.isWindows(),
            powershellProfile: parsed["powershell-profile"],
            cmder: wantCmder,
            cmderConfig: parsed["cmder-config"],
          });
          break;
        }

        case "levainShell": {
          const parsed = parseArgs(args, {
            stringOnce: ["saveVar"],
            boolean: ["stripCRLF", "ignoreErrors"],
          });
          if (parsed.saveVar) {
            resolver.markRuntimeVar(parsed.saveVar);
          }
          if (stage === "install" && parsed._.length > 0) {
            const command = parsed._.map((tok: string) => quoteShellArg(tok)).join(" ");
            if (command.toLowerCase().includes("cmd-config.reg")) {
              manualReviewSet.add(t("cmd.explain.uninstall.reviewCmdConfigReg"));
            } else {
              manualReviewSet.add(t("cmd.explain.uninstall.reviewShellCommand", { command }));
            }
          }
          break;
        }

        default:
          break;
      }
    } catch {
      // Ignore malformed action args during best-effort reverse analysis
    }
  };

  for (const line of installActions) {
    processLine(line, "install");
  }
  for (const line of envActions) {
    processLine(line, "env");
  }

  const steps: string[] = [];

  // 1. Shell activation hooks (from activateInit)
  if (activateTargets.length > 0) {
    const merged: ActivateInitTarget = {
      cmd: activateTargets.some((item) => item.cmd),
      bash: activateTargets.some((item) => item.bash),
      powershell: activateTargets.some((item) => item.powershell),
      powershellProfile: activateTargets.find((item) => item.powershellProfile)?.powershellProfile,
      cmder: activateTargets.some((item) => item.cmder),
      cmderConfig: activateTargets.find((item) => item.cmderConfig)?.cmderConfig,
    };

    if (merged.cmd) {
      steps.push(
        t("cmd.explain.uninstall.stepActivateCmd", {
          hookPath: config.configPaths.levainHookPath,
          removeHookCmd: removeFileCommand(config.configPaths.levainHookPath),
        }),
      );
    }
    if (merged.powershell) {
      steps.push(
        merged.powershellProfile
          ? t("cmd.explain.uninstall.stepActivatePowershellCustom", { profile: merged.powershellProfile })
          : t("cmd.explain.uninstall.stepActivatePowershell"),
      );
    }
    if (merged.bash) {
      let profileList = "~/.bashrc, ~/.bash_profile, ~/.profile";
      try {
        profileList = HomePaths.profileCandidates().map((p) => `\`${p}\``).join(", ");
      } catch {
        profileList = "`~/.bashrc`, `~/.bash_profile`, `~/.profile`";
      }
      steps.push(t("cmd.explain.uninstall.stepActivateBash", { profiles: profileList }));
    }
    if (merged.cmder) {
      const targetDir = merged.cmderConfig || "%CMDER_ROOT%\\config";
      steps.push(t("cmd.explain.uninstall.stepActivateCmder", { configDir: targetDir }));
    }
  }

  // 2. Windows Explorer context menus
  for (const menu of contextMenus.values()) {
    const cmd1 = `reg delete "HKCU\\Software\\Classes\\Directory\\shell\\${menu.id}" /f`;
    const cmd2 = `reg delete "HKCU\\Software\\Classes\\Directory\\Background\\shell\\${menu.id}" /f`;
    const label = menu.name ? `${menu.name} (\`${menu.id}\`)` : `\`${menu.id}\``;
    steps.push(t("cmd.explain.uninstall.stepContextMenu", { label, cmd1, cmd2 }));
  }
  if (contextMenus.size > 0) {
    manualReviewSet.add(t("cmd.explain.uninstall.reviewWin11ContextMenu"));
  }

  // 3. Desktop / Start Menu / Startup shortcuts
  for (const shortcut of shortcuts) {
    steps.push(
      t("cmd.explain.uninstall.stepRemoveShortcut", {
        shortcut,
        cmd: removeFileCommand(shortcut),
      }),
    );
  }

  // 4. Permanent PATH entries
  for (const dir of permanentPaths) {
    steps.push(
      t("cmd.explain.uninstall.stepRemovePermanentPath", {
        dir,
        cmd: removePermanentPathCommand(dir),
      }),
    );
  }

  // 5. Permanent environment variables
  for (const key of permanentEnvVars) {
    steps.push(
      t("cmd.explain.uninstall.stepRemovePermanentEnv", {
        key,
        cmd: removePermanentEnvCommand(key),
      }),
    );
  }

  // 6. Package install directory (skip `levain` baseDir on full cleanup since finalRemoveHome removes all of levainHome)
  if (!pkg.skipInstallDir() && !(options.fullCleanup && pkg.name === "levain")) {
    steps.push(
      t("cmd.explain.uninstall.stepRemoveInstallDir", {
        dir: pkg.baseDir,
        cmd: removeDirCommand(pkg.baseDir),
      }),
    );
  }

  // 7. External directories, cloned repositories, and files outside baseDir -> manual review (avoid data loss)
  for (const dir of externalClones) {
    manualReviewSet.add(t("cmd.explain.uninstall.reviewExternalClone", { dir }));
  }
  for (const dir of externalMkdirs) {
    if (!externalClones.has(dir)) {
      manualReviewSet.add(t("cmd.explain.uninstall.reviewExternalDir", { dir }));
    }
  }
  for (const target of externalFiles) {
    manualReviewSet.add(t("cmd.explain.uninstall.reviewExternalFile", { target }));
  }

  // 8. Package registry file (for partial uninstalls only — full cleanup removes the whole levainHome)
  if (!options.fullCleanup && !pkg.skipRegistry() && pkg.name !== "levain") {
    const registryEntry = path.resolve(config.configPaths.levainRegistryDir, path.basename(pkg.filePath));
    steps.push(
      t("cmd.explain.uninstall.stepRemoveRegistryEntry", {
        file: registryEntry,
        cmd: removeFileCommand(registryEntry),
      }),
    );
  }

  return {
    pkg,
    steps,
    manualReview: [...manualReviewSet],
    otherOsOnly,
  };
}

/**
 * Generates the final full-cleanup section for removing Levain itself and its metadata/cache/config.
 */
export function buildLevainFinalCleanupSteps(config: Config): string[] {
  const steps: string[] = [];
  const levainHome = config.configPaths.levainHome;
  const cacheDir = config.configPaths.levainCacheDir;

  if (levainHome && levainHome !== "<unset>") {
    steps.push(
      t("cmd.explain.uninstall.finalRemoveHome", {
        dir: levainHome,
        cmd: removeDirCommand(levainHome),
      }),
    );
  }

  if (cacheDir && (!levainHome || levainHome === "<unset>" || !isInsideDir(cacheDir, levainHome))) {
    steps.push(
      t("cmd.explain.uninstall.finalRemoveCache", {
        dir: cacheDir,
        cmd: removeDirCommand(cacheDir),
      }),
    );
  }

  try {
    const configFile = HomePaths.levainConfigFile;
    steps.push(
      t("cmd.explain.uninstall.finalRemoveConfigFile", {
        file: configFile,
        cmd: removeFileCommand(configFile),
      }),
    );
    const userInfoFile = HomePaths.levainYaml;
    steps.push(
      t("cmd.explain.uninstall.finalRemoveUserInfo", {
        file: userInfoFile,
        cmd: removeFileCommand(userInfoFile),
      }),
    );
  } catch {
    // Ignore when home directory env vars are unavailable
  }

  steps.push(t("cmd.explain.uninstall.finalCleanTemp"));
  steps.push(t("cmd.explain.uninstall.finalRestartShells"));

  return steps;
}
