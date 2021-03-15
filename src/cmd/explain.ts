import * as log from "https://deno.land/std/log/mod.ts";

import Config from "../lib/config.ts";
import {parseArgs} from "../lib/parse_args.ts";
import Package from "../lib/package/package.ts";

import Command from "./command.ts";

/*
 * TODO:
 * - Handle password (don't ask, don't show)
 * - Show package sourceDir and baseDir
 */
export default class ExplainCommand implements Command {
    constructor(private config: Config) {
    }

    execute(args: string[]): void {
        const myArgs = parseArgs(args, {
        });

        log.info(`EXPLAIN ${myArgs}`)
        let pkgNames: string[] = myArgs._

        if (pkgNames.length == 0) {
            throw new Error(`explain - Nothing to explain.`)
        }

        let pkgs: Package[] | null = this.config.packageManager.resolvePackages(pkgNames)
        if (!pkgs) {
            throw new Error(`explain - Nothing to explain.`)
        }

        log.info("");
        log.info("-----------------");

        log.info('')
        log.info(`# levain explain ${pkgNames}`)
        log.info('')

        for (let pkg of pkgs) {
            log.info(`## levain install ${pkg.name}`)
            this.showActions(pkg, "cmd.install")
            this.showActions(pkg, "cmd.env")
            log.info('')
            log.info('')
        }

        log.info("");
        log.info("-----------------");
        log.info("");
    }

    private showActions(pkg: Package, item: string) {
        let list = pkg.yamlItem(item)
        if (!list) {
            return
        }

        log.info('')
        for (let action of list) {
            let actionWithVars = this.config.replaceVars(action, pkg.name)
            log.info(`* ${actionWithVars}`)
        }
    }

    readonly oneLineExample = "  explain <package>..."
}
