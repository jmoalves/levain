import { existsSync } from "https://deno.land/std/fs/mod.ts";

import Command from "../lib/command.ts";
import Config from "../lib/config.ts";
import Package from "../lib/package/package.ts";
import Loader from '../lib/loader.ts';

export default class Shell implements Command {
    constructor(private config:Config) {
    }

    async execute(args: string[]) {
        console.log("shell " + JSON.stringify(args));

        let pkgs:Package[]|null = this.config.packageManager.resolvePackages(args);

        if (!pkgs) {
            console.error("");
            return;
        }

        console.log("");
        console.log("==================================");
        const context:any = {};
        for (let pkg of pkgs) {
            await this.shellActions(context, pkg);
        }

        this.openShell(context);
    }

    private async shellActions(context:any, pkg: Package) {
        if (!this.config) {
            return;
        }

        if (!existsSync(`${pkg.baseDir}`)) {
            return;
        }

        let actions = pkg.yamlItem("cmd.shell")
        if (!actions) {
            return;
        }

        console.log("=== ENV", pkg.name, "-", pkg.version);
        const loader = new Loader(this.config);
        for (let action of actions) {
            await loader.action(context, pkg, action);
        }
    }

    async openShell(context: any) {
        // TODO: Handle other os's
        if (Deno.build.os != "windows") {
            throw `${Deno.build.os} not supported`;
        }

        let cmd = "cmd /u /k";

        let myPath:string = context.action?.addpath?.path;
        let pathStr = undefined;
        if (myPath) {
            for (let p of myPath) {
                if (pathStr) {
                    pathStr += ";";
                } else {
                    pathStr = "";
                }
                pathStr += p;
            }    

            if (pathStr) {
                pathStr = ` path ${pathStr};%PATH%`;
            }

            cmd += pathStr + " &&";
        }

        cmd += ' prompt [levain]$P$G';
        console.log("- CMD -", cmd);

        let opt:any = {};
        opt.cmd = cmd.split(" ");

        if (this.config.levainHome) {
            opt.env = {
                "levainHome": this.config.levainHome
            }
        }

        const p = Deno.run(opt);
        
        await p.status();

        console.log("");
        console.log("Levain - Goodbye!");
    }
}
