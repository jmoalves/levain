import * as log from "jsr:@std/log";

import t from '../lib/i18n.ts'

import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';
import {parseArgs} from "../lib/parse_args.ts";

import Command from "./command.ts";

export default class InfoCommand implements Command {
    constructor(private config: Config) {
    }

    async execute(args: string[]) {
        const myArgs = parseArgs(args, {
            boolean: [
                "verbose"
            ]
        });


        let pkgs:Package[] | null = null
        if (myArgs._ && myArgs._.length > 0) {
            let pkgNames: string[] = myArgs._;

            pkgs = this.config.packageManager.resolvePackages(pkgNames, false, false);

            log.info("")
            log.info(t("cmd.info.yourPackages"))
            pkgNames.forEach(pkg => this.showPackage(myArgs, 0, pkg))
        } else {
            this.config.packageManager.resolvePackages(["levain"], false, false);
        }

        log.info("")
        log.info("=== Levain")
        this.showPackage(myArgs, 0, "levain")

        if (pkgs) {
            log.info("")
            log.info(t("cmd.info.installationOrder"))
            pkgs.forEach(pkg => log.info(pkg.name))
        }
    }

    showPackage(args: any, level: number, pkgName: string) {
        if (pkgName == "levain" && level != 0) {
            return
        }

        const ident = "  ".repeat(level)
        let pkg: Package | undefined = this.config.packageManager.package(pkgName);

        if (!pkg) {
            log.info("")
            log.info(t("cmd.info.packageNotFound", {pkgName: pkgName}))
            return
        }

        log.info(`${ident}+ ${pkg.name} - ${pkg.version}${ pkg.installed ? "" : t("cmd.info.notInstalled")}${ pkg.installed && pkg.updateAvailable ? t("cmd.info.needUpdate") : ""}`)
        if (args.verbose) {
            log.info(`${ident}| baseDir...: ${pkg.baseDir}`)
            log.info(`${ident}| pkgDir....: ${pkg.pkgDir}`)
            log.info(`${ident}| repo......: ${pkg.repo?.name}`)
            log.info(`${ident}\\ filePath..: ${pkg.filePath}`)
        }
    
        pkg.dependencies?.forEach(dep => this.showPackage(args, level+1, dep))    
    }

    readonly oneLineExample = t("cmd.info.example")
}
