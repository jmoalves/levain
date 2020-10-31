import * as log from "https://deno.land/std/log/mod.ts";

import Command from "../lib/command.ts";
import Config from "../lib/config.ts";
import Package from "../lib/package/package.ts";
import Loader from '../lib/loader.ts';

export default class Install implements Command {
    constructor(private config:Config) {
    }

    async execute(args: string[]) {
        log.info("install " + JSON.stringify(args));

        let pkgs:Package[]|null = this.config.packageManager.resolvePackages(args);

        if (!pkgs) {
            console.error("");
            return;
        }

        log.info("");
        log.info("==================================");
        for (let pkg of pkgs) {
            await this.installPackage(pkg);
        }
    }

    private async installPackage(pkg: Package) {
        if (!this.config) {
            return;
        }

        if (pkg.installed) {
            log.info("=== SKIP installed", pkg.name);
            return;
        }

        log.info("");
        log.info("=== INSTALL", pkg.name, "-", pkg.version);
        let actions = pkg.yamlItem("cmd.install")
        if (!actions) {
            actions = [];
        } else {
            if (!pkg.yamlItem("levain.config.noBaseDir")) {
                actions.unshift("mkdir ${baseDir}");
            }
        }

        // Standard actions - At the head (unshift), they are in reverse order (like a STACK)
        actions.unshift("mkdir " + this.config.levainRegistry);
        actions.unshift("mkdir --compact ${levainHome}"); 
      
        // Standard actions - At the rear (push), they are in normal order (like a QUEUE)
        actions.push("copy --verbose " + pkg.name + ".levain.yaml " + this.config.levainRegistry);
        //

        const loader = new Loader(this.config);
        for (let action of actions) {
            await loader.action(pkg, action);
        }
    }
}
