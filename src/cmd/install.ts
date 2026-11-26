import * as log from "@std/log";
import * as path from "@std/path";
import { copySync, existsSync } from "@std/fs";

import t from "../lib/i18n.ts";

import type Config from "../lib/config.ts";
import type Package from "../lib/package/package.ts";
import Loader from "../lib/loader.ts";
import { Timer } from "../lib/timer.ts";
import { parseArgs } from "../lib/parse_args.ts";
import VersionNumber from "../lib/utils/version_number.ts";
import LevainVersion from "../levain_version.ts";
import DateUtils from "../lib/utils/date_utils.ts";
import { retry } from "../lib/utils/utils.ts";

import type Command from "./command.ts";
import { FileUtils } from "../lib/fs/file_utils.ts";
import { resolvePackageActions } from "../lib/package/package_actions.ts";

export interface InstallOptions {
  force?: boolean;
  noUpdate?: boolean;
  promptForUpdates?: boolean;
  strictMinVersion?: boolean;
}

export default class Install implements Command {
  private readonly currentLevainVersion: VersionNumber;
  private readonly maxRetries = 5;

  constructor(private config: Config) {
    this.currentLevainVersion = LevainVersion.levainVersion;
  }

  async execute(args: string[]) {
    const myArgs = parseArgs(args, {
      boolean: [
        "force",
        "noUpdate",
      ],
      stopEarly: false,
    });

    let pkgNames: string[] = myArgs._;

    if (pkgNames.length == 0) {
      const curDirPkg = await this.config.repositoryManager.currentDirPackage();
      if (curDirPkg && curDirPkg.dependencies && curDirPkg.dependencies.length > 0) {
        pkgNames = curDirPkg.dependencies;
      }
    }

    await this.installPackages(pkgNames, {
      force: !!myArgs.force,
      noUpdate: !!myArgs.noUpdate,
      promptForUpdates: true,
      strictMinVersion: false,
    });
  }

  async installPackages(pkgNames: string[], options: InstallOptions = {}): Promise<boolean> {
    if (pkgNames.length == 0) {
      throw new Error(t("cmd.install.noPackages"));
    }

    let pkgs: Package[] | null = this.config.packageManager.resolvePackages(pkgNames);
    if (!pkgs) {
      const missing = pkgNames.filter((name) => !this.config.packageManager.getSimilarNames(name).has(name));
      const reportMissing = missing.length > 0 ? missing : pkgNames;

      log.info(``);
      log.info(t("cmd.install.unableToFind", { pkgNames: reportMissing }));

      log.info("");
      log.info(t("cmd.install.similar"));
      for (const name of reportMissing) {
        log.info(`${name} => ${[...this.config.packageManager.getSimilarNames(name)]}`);
      }
      log.info("");
      throw new Error(t("cmd.install.errorNotFound", { pkgNames: reportMissing }));
    }

    log.info("");
    log.info("-----------------");

    const force = !!options.force;
    const noUpdate = force ? false : !!options.noUpdate;
    const promptForUpdates = options.promptForUpdates ?? true;
    const strictMinVersion = !!options.strictMinVersion;

    let shouldUpdate = !noUpdate;

    if (promptForUpdates && !force && !noUpdate) {
      // Check updates
      const willUpdate = [];
      const willInstall = [];

      for (const pkg of pkgs) {
        const name = pkg.name;
        if (!pkg.installed) {
          willInstall.push(name);
        } else if (pkg.updateAvailable) {
          willUpdate.push(pkg.name);
        }
      }

      if (willInstall.length > 0) {
        log.debug(t("cmd.install.installing", { object: JSON.stringify(willInstall) }));
        log.debug(t("cmd.install.updating", { object: JSON.stringify(willUpdate) }));
      } else if (willUpdate.length > 0) {
        log.info("");
        log.info("");
        log.info(t("cmd.install.updateAvailable"));
        log.info(`${JSON.stringify(willUpdate, null, 3)}`);
        log.info("");

        const answer = prompt(t("cmd.install.updatePrompt"), t("cmd.install.updatePromptDefault"));
        if (!answer || ![t("cmd.install.updatePromptDefault")].includes(answer.toUpperCase())) {
          log.info(t("cmd.install.askLater"));
          shouldUpdate = false;

          log.info("");
          log.info(t("cmd.install.reloadInstalled"));
          pkgs = this.config.packageManager.resolvePackages(pkgNames, true);
          if (!pkgs) {
            throw new Error(t("cmd.install.nothing"));
          }
        }
      }
    }

    const pkgNameSet = new Set(pkgNames);
    const bkpTag = this.bkpTag();
    let anyChanged = false;
    for (const pkg of pkgs) {
      const forcePkg = force && pkgNameSet.has(pkg.name);
      if (await this.installPackage(bkpTag, pkg, forcePkg, shouldUpdate, strictMinVersion)) {
        anyChanged = true;
      }
    }

    log.debug("");
    log.debug("-----------------");
    log.debug(t("cmd.install.finished", { pkgNames: pkgNames }));
    return anyChanged;
  }

  private async installPackage(
    bkpTag: string,
    pkg: Package,
    force: boolean = false,
    shouldUpdate: boolean = true,
    strictMinVersion: boolean = false,
  ): Promise<boolean> {
    if (!this.config) {
      return false;
    }

    const timer = new Timer();

    let shouldInstall = true;
    let verb = "INSTALL";
    if (pkg.installed) {
      if (!pkg.skipInstallDir() && !existsSync(pkg.baseDir)) {
        verb = "MISSING";
      } else if (shouldUpdate && pkg.updateAvailable) {
        verb = "UPDATE";
      } else if (force) {
        verb = "FORCE";
      } else {
        verb = "ALREADY INSTALLED";
        shouldInstall = false;
      }
    }

    if (shouldInstall) {
      log.info("");
      log.info(`- ${verb} ${pkg.name}@${pkg.version}`);
    } else {
      log.info(`✓ ${pkg.name}@${pkg.version}`);
    }

    let envPkg = pkg;
    if (shouldInstall) {
      const levainTag = pkg.levainTag;
      log.debug(`- ${pkg.name} - levainTag: ${JSON.stringify(levainTag)}`);

      if (levainTag?.minVersion) {
        const minVersion = new VersionNumber(levainTag.minVersion);
        if (minVersion.isNewerThan(this.currentLevainVersion)) {
          log.warn(
            t("cmd.install.ignoreMinVer", { pkg: pkg.name, min: minVersion, current: this.currentLevainVersion }),
          );
          if (!pkg.installed || verb === "MISSING" || force || strictMinVersion) {
            const upgradeMsg = t("cmd.install.mustUpgradeLevain", { pkg: pkg.name });
            log.error(upgradeMsg);
            throw new Error(upgradeMsg);
          }
          shouldInstall = false;
          // Use the currently installed recipe for cmd.env instead of the incompatible newer recipe
          envPkg = this.config.repositoryManager.repositoryInstalled.resolvePackage(pkg.name) ?? pkg;
        }
      }
    }

    if (shouldInstall) {
      /* FIXME:
       * Move this to another class. Perhaps a class to manage the installed environment
       * Perhaps the better approach is to install the packages to a temp dir and move upon successful installation
       * However, this "tempDir" change could EASILY BREAK all the recipes
       */
      await this.savePreviousInstall(bkpTag, pkg);
    }

    // https://github.com/jmoalves/levain/issues/148
    if (shouldInstall) {
      const registryEntry = path.resolve(this.config.configPaths.levainRegistryDir, path.basename(pkg.filePath));
      if (existsSync(registryEntry)) {
        log.debug(`REMOVE ${registryEntry}`);
        FileUtils.removeSync(registryEntry);
      }
    }

    const actions: Array<{ pkg: Package; action: string }> = [];

    if (shouldInstall) {
      const installActions = resolvePackageActions(pkg, "cmd.install");
      if (!pkg.skipInstallDir()) {
        installActions.unshift("mkdir ${baseDir}");
      }

      // Standard actions - At the head (unshift), they are in reverse order (like a STACK)
      actions.unshift({ pkg, action: `mkdir "${this.config.configPaths.levainSafeTempDir}"` });
      actions.unshift({ pkg, action: `mkdir "${this.config.configPaths.levainRegistryDir}"` });
      actions.unshift({ pkg, action: "mkdir --compact ${levainHome}" });

      for (const action of installActions) {
        actions.push({ pkg, action });
      }
    }

    // Standard actions - Env - At the rear (push), they are in normal order (like a QUEUE)
    const envActions = resolvePackageActions(envPkg, "cmd.env");
    for (const action of envActions) {
      actions.push({ pkg: envPkg, action });
    }

    if (shouldInstall) {
      // Standard actions - At the rear (push), they are in normal order (like a QUEUE)
      if (!pkg.skipRegistry()) {
        actions.push({
          pkg,
          action: `copy --verbose "${pkg.filePath}" "${this.config.configPaths.levainRegistryDir}"`,
        });
      }
    }

    const loader = new Loader(this.config);
    for (const entry of actions) {
      await loader.action(entry.pkg, entry.action);
    }

    log.debug(t("cmd.install.pkgTook", { pkg: pkg.name, timer: timer.humanize() }));
    return shouldInstall;
  }

  private async savePreviousInstall(bkpTag: string, pkg: Package): Promise<void> {
    if (!existsSync(pkg.baseDir)) {
      log.debug(t("cmd.install.goodNotSave", { baseDir: pkg.baseDir }));
      return;
    }

    try {
      const bkpDir = path.resolve(this.config.configPaths.levainBackupDir, bkpTag);
      const src = pkg.baseDir;
      const dst = path.resolve(bkpDir, path.basename(src));

      log.info(`SAVING ${src} => ${dst}`);

      if (!existsSync(bkpDir)) {
        log.debug(`- SAVE-MKDIR ${bkpDir}`);
        Deno.mkdirSync(bkpDir, { recursive: true });
      }

      if (pkg.yamlItem("levain.preserveBaseDirOnUpdate")) {
        log.debug(`- SAVE-COPY  ${src} => ${dst}`);
        copySync(src, dst);
        log.info(t("cmd.install.keepingBaseDir", { pkg: pkg.name }));
        return;
      }

      log.debug(`- SAVE-MOV   ${src} => ${dst}`);
      let crossDevice = false;
      await retry(this.maxRetries, () => {
        try {
          Deno.renameSync(src, dst);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("EXDEV") || msg.includes("os error 17") || msg.includes("os error 18")) {
            crossDevice = true;
            return;
          }
          throw err;
        }
      });

      if (crossDevice) {
        log.debug(`- SAVE-COPY (cross-device) ${src} => ${dst}`);
        copySync(src, dst, { overwrite: true });
        log.debug(`- SAVE-DEL   ${src}`);
        await retry(this.maxRetries, () => FileUtils.removeSync(src, { recursive: true }));
      }

      log.debug(`SAVED ${src} => ${dst}`);
    } catch (err) {
      const errMsg = t("cmd.install.errorSaving", { pkg: pkg.name });
      log.error(errMsg);
      log.debug(`SAVE error -> ${err}`);
      throw new Error(errMsg, { cause: err });
    }
  }

  bkpTag(dt: Date = new Date()): string {
    return Install.bkpTag(dt);
  }

  static bkpTag(dt: Date = new Date()): string {
    return `bkp-${DateUtils.dateTimeTag(dt)}`;
  }

  readonly oneLineExample = t("cmd.install.example");
}
