import { existsSync } from "https://deno.land/std/fs/mod.ts";

import Command from "../lib/command.ts";
import Config from "../lib/config.ts";
import Package from "../lib/package/package.ts";
import Repository from "../lib/repository.ts";
import Loader from '../lib/loader.ts';

export default class Install implements Command {
    constructor(private config:Config) {
    }

    async execute(args: string[]) {
        console.log("install " + JSON.stringify(args));

        let pkgs:Package[]|null = this.config.packageManager.resolvePackages(args);

        if (!pkgs) {
            console.error("");
            return;
        }

        console.log("");
        console.log("==================================");
        for (let pkg of pkgs) {
            await this.installPackage(pkg);
        }
    }

    private async installPackage(pkg: Package) {
        if (!this.config) {
            return;
        }

        console.log("");
        console.log("=== INSTALL", pkg.name, "-", pkg.version);
        if (existsSync(`${pkg.baseDir}`)) {
            console.log("Already installed at", pkg.baseDir);
            return;
        }

        let actions = pkg.yamlItem("cmd.install")
        if (!actions) {
            console.log("Nothing to do");
            return;
        }

        // Standard actions - At the head (unshift), this is a STACK! (reverse order)
        actions.unshift("mkdir ${baseDir}");
        actions.unshift("mkdir ${levainHome}/.levain/registry");
        actions.unshift("mkdir --compact ${levainHome}"); 
      
        // Standard actions - At the rear (push), it is in normal order        
        actions.push("copy --verbose " + pkg.name + ".levain.yaml ${levainHome}/.levain/registry");
        //

        const loader = new Loader(this.config);
        for (let action of actions) {
            await loader.action(pkg, action);
        }
    }
}
