import * as log from "@std/log";

import t from "../lib/i18n.ts";

import type Config from "../lib/config.ts";
import { OsShell } from "../lib/os/os_shell.ts";
import OsUtils from "../lib/os/os_utils.ts";
import Loader from "../lib/loader.ts";

import type Command from "./command.ts";
import Install from "./install.ts";
import type Package from "../lib/package/package.ts";
import { resolvePackageActions } from "../lib/package/package_actions.ts";
import { InstanceLock } from "../lib/fs/instance_lock.ts";

export default class Shell implements Command {
  private loader: Loader;

  constructor(private config: Config) {
    this.loader = new Loader(config);
  }

  async execute(args: string[]) {
    const { pkgNames, pkgActions, curDirPkg } = await this.readPackages(args);
    await this.installPackages(pkgNames);
    const osShell: OsShell = new OsShell(this.config, pkgNames, true);
    osShell.interactive = true;
    await this.runShell(osShell, curDirPkg, pkgActions, true);
  }
  
  async readPackages(args: string[]): Promise<ShellPackages> {
    let pkgNames = args;
    let pkgActions = undefined;
    let curDirPkg = undefined;

    if (pkgNames.length == 0) {
      curDirPkg = await this.config.repositoryManager.currentDirPackage();
      if (curDirPkg && curDirPkg.dependencies && curDirPkg.dependencies.length > 0) {
        pkgNames = curDirPkg.dependencies;
        const shellActions = resolvePackageActions(curDirPkg, "cmd.shell");
        const envActions = resolvePackageActions(curDirPkg, "cmd.env");
        const combined = [...shellActions, ...envActions];
        pkgActions = combined.length > 0 ? combined : undefined;
      } else {
        pkgNames = [this.config.defaultPackage];
      }
    }
    return { pkgNames, pkgActions, curDirPkg };

  }

  async installPackages(pkgNames: string[]) {
    log.debug(t("cmd.shell.checkUpdates", { shouldCheck: this.config.shellCheckForUpdate }));
    const lock = await InstanceLock.acquire(this.config.configPaths.levainLockPath, { command: "shell" });
    try {
      await OsUtils.sanitizeUserPath();
      const installer = new Install(this.config);
      const changed = await installer.installPackages(pkgNames, {
        force: false,
        noUpdate: !this.config.shellCheckForUpdate,
        promptForUpdates: true,
        strictMinVersion: false,
      });
      if (changed) {
        await this.config.repositoryManager.reloadInstalled();
      }
    } finally {
      lock.release();
    }
  }

  async runShell(osShell: OsShell, curDirPkg: Package | undefined, pkgActions: string[] | undefined, openShell: boolean) {
     // Actions
    if (curDirPkg && pkgActions) {
      for (const action of pkgActions) {
        // Infinite loop protection - https://github.com/jmoalves/levain/issues/111
        if (action.startsWith("levainShell ")) {
          throw new Error(t("cmd.shell.notAllowed", { pkg: curDirPkg.name, action: action }));
        }

        await this.loader.action(curDirPkg, action);
      }
    }

    // Running shell
    await osShell.execute([], openShell);
  }

  readonly oneLineExample = t("cmd.shell.example");
}

export interface ShellPackages {
  pkgNames: string[];
  pkgActions: string[] | undefined;
  curDirPkg: Package | undefined;
}