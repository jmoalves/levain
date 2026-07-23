import * as log from "@std/log";

import t from "../lib/i18n.ts";

import Config from "../lib/config.ts";
import { OsShell } from "../lib/os/os_shell.ts";
import Loader from "../lib/loader.ts";

import Command from "./command.ts";
import Package from "../lib/package/package.ts";

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
        let actions = curDirPkg.yamlItem("cmd.shell");
        const envActions = curDirPkg.yamlItem("cmd.env");
        if (envActions) {
          if (actions) {
            Array.prototype.push.apply(actions, envActions);
          } else {
            actions = envActions;
          }
        }
        pkgActions = actions;
      } else {
        pkgNames = [this.config.defaultPackage];
      }
    }
    return { pkgNames, pkgActions, curDirPkg };

  }

  async installPackages(pkgNames: string[]) {
    log.debug(t("cmd.shell.checkUpdates", { shouldCheck: this.config.shellCheckForUpdate }));
    if (this.config.shellCheckForUpdate) {
      await this.loader.command("install", pkgNames);
    } else {
      await this.loader.command("install", ["--noUpdate"].concat(pkgNames));
    }
    await this.config.repositoryManager.reload();
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