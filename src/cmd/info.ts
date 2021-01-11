import * as log from "https://deno.land/std/log/mod.ts";

import Command from "./command.ts";
import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';
import {parseArgs} from "../lib/parse_args.ts";

export default class InfoCommand implements Command {
    constructor(private config: Config) {
    }

    async execute(args: string[]) {
        const myArgs = parseArgs(args, {
            boolean: [
                "verbose"
            ]
        });

        let pkgNames: string[] = [];

        if (!myArgs._ || myArgs._.length == 0) {
            log.info("")
            log.info("You must inform the package(s)")
            log.info("")
            log.info(`\t${this.oneLineExample}`)
            throw Error("You must inform the package(s)")
        }

        pkgNames = myArgs._;
        this.config.packageManager.resolvePackages(pkgNames, false, false);

        log.info("")
        log.info("=== Your packages")
        pkgNames.forEach(pkg => this.showPackage(myArgs, 0, pkg))

        log.info("")
        log.info("=== Levain")
        this.showPackage(myArgs, 0, "levain")
    }

    showPackage(args: any, level: number, pkgName: string) {
        if (pkgName == "levain" && level != 0) {
            return
        }

        const ident = "  ".repeat(level)
        let pkg: Package | undefined = this.config.packageManager.package(pkgName);

        if (!pkg) {
            log.info("")
            log.info(`Package not found - ${pkgName}`)
            return
        }

        log.info(`${ident}+ ${pkg.name} - ${pkg.version}${ pkg.installed ? "" : " - NOT installed"}${ pkg.installed && pkg.updateAvailable ? " - need UPDATE" : ""}`)
        if (args.verbose) {
            log.info(`${ident}| baseDir...: ${pkg.baseDir}`)
            log.info(`${ident}| pkgDir....: ${pkg.pkgDir}`)
            log.info(`${ident}| repo......: ${pkg.repo?.name}`)
            log.info(`${ident}\\ filePath..: ${pkg.filePath}`)
            // log.info(pkg.yamlStruct: any;
            // readonly dependencies: string[] | undefined;    
        }
    
        pkg.dependencies?.forEach(dep => this.showPackage(args, level+1, dep))    
    }

    readonly oneLineExample = "  info [--verbose] <package name> ... <package name>"
}
