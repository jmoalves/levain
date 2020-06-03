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

        this.openShell(context.action.addpath.path);
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

    async openShell(myPath: string) {
        // TODO: Handle other os's
        if (Deno.build.os != "windows") {
            throw `${Deno.build.os} not supported`;
        }

        let pathStr = "";
        for (let p of myPath) {
            if (pathStr.length != 0) {
                pathStr += ";";
            }
            pathStr += p;
        }

        console.log("- CMD - PATH", pathStr);
        let args = `cmd /k path ${pathStr};%PATH && cls && echo Levain shell`.split(" ");

        const p = Deno.run({
            cmd: args
        });
        
        await p.status();

        console.log("");
        console.log("Levain - Goodbye");
    }
}
