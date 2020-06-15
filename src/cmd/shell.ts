import { existsSync } from "https://deno.land/std/fs/mod.ts";

import Command from "../lib/command.ts";
import Config from "../lib/config.ts";
import Package from "../lib/package/package.ts";
import Loader from '../lib/loader.ts';
import { parseArgs } from "../lib/parseArgs.ts";

export default class Shell implements Command {
    constructor(private config:Config) {
    }

    async execute(args: string[]) {
        let myArgs = parseArgs(args, {
            stringMany: [
                "package"
            ],
            boolean: [
                "run"
            ]
        });
        console.log("shell " + JSON.stringify(args));

        let pkgs:Package[]|null = this.config.packageManager.resolvePackages(myArgs.package);

        if (!pkgs) {
            console.error("");
            return;
        }

        console.log("");
        console.log("==================================");
        for (let pkg of pkgs) {
            await this.shellActions(pkg);
        }

        await this.openShell(myArgs);
    }

    private async shellActions(pkg: Package) {
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
            if (action.startsWith("levainShell")) { 
                // Potential infinite loop here!
                // TODO: REFACTOR THIS!
                let args:any = {};
                args._ = this.config.replaceVars(action, pkg.name).split(" ");
                args._.shift();
                args.run = true;
                await this.openShell(args);
            } else {
                await loader.action(pkg, action);
            }
        }
    }

    async openShell(args: any) {
        // TODO: Handle other os's
        if (Deno.build.os != "windows") {
            throw `${Deno.build.os} not supported`;
        }

        let cmd = this.concatCmd(
            "cmd /u " + (args.run ? "/c" : "/k"),
            // (args.run ? undefined : "cls"),
            this.addPath(),
            (args.run ? undefined : 'prompt [levain]$P$G'),
            (args.run ? args._.join(" ") : undefined)
        );
        console.log("- CMD -", cmd);

        let opt:any = {};
        opt.cmd = cmd.split(" ");
        opt.env = {}

        this.setEnv(opt.env);
        if (this.config.levainHome) {
            opt.env["levainHome"] = this.config.levainHome;
        }

        const p = Deno.run(opt);
        
        let status = await p.status();

        if (!status.success) {
            throw "CMD terminated with code " + status.code;
        }

        if (!args.run) {
            console.log("");
            console.log("Levain - Goodbye!");    
        }
    }

    private concatCmd(...parts :(string|undefined)[]) :string {
        return this.concatCmdArr(parts);
    }
    
    private concatCmdArr(parts :(string|undefined)[]) :string {
        if (!parts) {
            return "";
        }

        // first
        // first second
        // first second && third
        // first secont && third && fourth (and so on)
        // undefine does not count
        let sep = "";
        let idx = 1;
        let result:string = "";
        for (let part of parts) {
            if (part) {
                if (idx == 1) {
                    sep = "";
                } else if (idx < 3) {
                    sep = " ";
                } else {
                    sep = " && ";
                }
                result += sep + part;
                idx++;
            }
        }

        return result;
    }

    private addPath(): string|undefined {
        let myPath:string = this.config.context.action?.addpath?.path;
        if (!myPath) {
            return "";
        }

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
                pathStr = `path ${pathStr};%PATH%`;
            }
        }

        return pathStr;
    }

    private setEnv(env: any): void {
        if (!this.config.context.action?.setEnv?.env) {
            return undefined;
        }

        for (let key of Object.keys(this.config.context.action.setEnv.env)) {
            let value = this.config.context.action.setEnv.env[key];
            if (value) {
                env[key] = value;
            }
        }
    }
}
