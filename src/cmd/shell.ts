import * as log from "jsr:@std/log";

import t from '../lib/i18n.ts'

import Config from "../lib/config.ts";
import {OsShell} from '../lib/os/os_shell.ts';
import Loader from '../lib/loader.ts';

import Command from "./command.ts";

export default class Shell implements Command {
    constructor(private config: Config) {
    }

    async execute(args: string[]) {
        let pkgNames = args;
        let pkgActions = undefined;
        let curDirPkg = undefined;

        if (pkgNames.length == 0) {
            curDirPkg = await this.config.repositoryManager.currentDirPackage()
            if (curDirPkg && curDirPkg.dependencies && curDirPkg.dependencies.length > 0) {
                pkgNames = curDirPkg.dependencies
                let actions = curDirPkg.yamlItem("cmd.shell");
                const envActions = curDirPkg.yamlItem("cmd.env");
                if (envActions) {
                    if (actions) {
                        Array.prototype.push.apply(actions, envActions);
                    } else {
                        actions = envActions;
                    }
                }
                pkgActions = actions
            } else {
                pkgNames = [this.config.defaultPackage]
            }
        }

        const loader = new Loader(this.config);

        log.debug(t("cmd.shell.checkUpdates", { shouldCheck: this.config.shellCheckForUpdate }))
        if (this.config.shellCheckForUpdate) {
            await loader.command("install", pkgNames);
        } else {
            await loader.command("install", ["--noUpdate"].concat(pkgNames));
        }
        await this.config.repositoryManager.reload();

        // Actions
        if (curDirPkg && pkgActions) {
            for (let action of pkgActions) {
                // Infinite loop protection - https://github.com/jmoalves/levain/issues/111
                if (action.startsWith('levainShell ')) {
                    throw new Error(t("cmd.shell.notAllowed", { pkg: curDirPkg.name, action: action }))
                }

                await loader.action(curDirPkg, action);
            }
        }

        // Running shell
        const osShell: OsShell = new OsShell(this.config, pkgNames, true);
        osShell.interactive = true;
        await osShell.execute([]);
    }

    readonly oneLineExample = t("cmd.shell.example")
}
