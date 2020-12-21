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
        let pkgNames: string[] = [];

        if (args && args.length > 0) {
            pkgNames = args;
        } else {
            pkgNames = [this.config.defaultPackage];
        }

        let pkgs: Package[] | null = this.config.packageManager.resolvePackages(pkgNames);
        if (pkgs) {
            let needInstall = pkgs
                    .map(pkg => !pkg.installed || pkg.updateAvailable)
                    .reduce((acc, value) => acc || value);

            if (needInstall) {
                let loader = new Loader(this.config);
                await loader.command("install", pkgNames);
            } else {
                log.debug("No package to install or upgrade");
            }
        }

        let osShell: OsShell = new OsShell(this.config, pkgNames, true);
        osShell.interactive = true;

        await osShell.execute([]);
    }
}
