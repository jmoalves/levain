import * as log from "https://deno.land/std/log/mod.ts";

import Config from "../lib/config.ts";
import {OsShell} from '../lib/os/os_shell.ts';
import Loader from '../lib/loader.ts';
import Package from '../lib/package/package.ts';

import Command from "./command.ts";

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

        let loader = new Loader(this.config);

        log.debug(`shell must check for updates? ${this.config.shellCheckForUpdate}`)
        if (this.config.shellCheckForUpdate) {
            await loader.command("install", pkgNames);
        } else {
            await loader.command("install", ["--noUpdate"].concat(pkgNames));
        }
        this.config.repositoryManager.invalidatePackages();

        // Running shell
        let osShell: OsShell = new OsShell(this.config, pkgNames, true);
        osShell.interactive = true;

        await osShell.execute([]);
    }

    readonly oneLineExample = "  shell <optional package name>"

}
