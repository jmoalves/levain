import * as log from "https://deno.land/std/log/mod.ts";

import Command from "./command.ts";
import Config from "../lib/config.ts";
import {OsShell} from '../lib/os_shell.ts';

import Loader from '../lib/loader.ts';
import Package from '../lib/package/package.ts';

export default class Shell implements Command {
    constructor(private config: Config) {
    }

    async execute(args: string[]) {
        let pkgNames: string[] = args;

        if (pkgNames.length == 0) {
            let curDirPkg = this.config.repositoryManager.currentDirPackage
            if (curDirPkg && curDirPkg.dependencies && curDirPkg.dependencies.length > 0) {
                pkgNames = curDirPkg.dependencies
            } else {
                pkgNames = [this.config.defaultPackage]
            }
        }

        let pkgs: Package[] | null = this.config.packageManager.resolvePackages(pkgNames);
        if (pkgs) {
            let needInstall = pkgs
                .map(pkg => !pkg.installed || pkg.updateAvailable)
                .reduce((acc, value) => acc || value);

            if (needInstall) {
                let loader = new Loader(this.config);
                await loader.command("install", pkgNames);
                this.config.repositoryManager.invalidatePackages();
            } else {
                log.debug("No package to install or upgrade");
            }
        }

        let osShell: OsShell = new OsShell(this.config, pkgNames, true);
        osShell.interactive = true;

        await osShell.execute([]);
    }

    readonly oneLineExample = "  shell <optional package name>"

}
