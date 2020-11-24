import * as log from "https://deno.land/std/log/mod.ts";

import {existsSync} from "https://deno.land/std/fs/mod.ts";

import Config from "../lib/config.ts";
import FileSystemPackage from "../lib/package/file_system_package.ts";
import Loader from '../lib/loader.ts';
import { parseArgs } from "../lib/parseArgs.ts";

export class OsShell {
    private dependencies: FileSystemPackage[];
    private _interactive: boolean = false;
    private _varName: string|undefined = undefined;
    private _ignoreErrors: boolean = false;
    private _stripCRLF: boolean = false;

    constructor(private config: Config,
                private pkgName: string) {
        if (!pkgName) {
            log.error("SHELL - No package");
            Deno.exit(1);
        }

        let pkgs: FileSystemPackage[] | null = this.config.packageManager.resolvePackages([ pkgName ]);
        if (!pkgs) {
            log.error("Unable to load dependencies for a levain shell. Aborting...");
            Deno.exit(1);
        }

        this.dependencies = pkgs;
    }

    set interactive(b: boolean) {
        this._interactive = b;
    }

    get interactive(): boolean {
        return this._interactive;
    }

    set saveVar(varName: string|undefined) {
        this._varName = varName;
    }

    get saveVar() : string|undefined {
        return this._varName;
    }

    set ignoreErrors(b: boolean) {
        this._ignoreErrors = b;
    }

    get ignoreErrors(): boolean {
        return this._ignoreErrors;
    }

    set stripCRLF(b: boolean) {
        this._stripCRLF = b;
    }

    get stripCRLF(): boolean {
        return this._stripCRLF;
    }

    async execute(args: string[]) {
        log.info("");
        log.info("==================================");
        for (let pkg of this.dependencies) {
            await this.shellActions(pkg);
        }

        await this.openShell(args);
    }

    private async shellActions(pkg: FileSystemPackage) {
        if (!this.config) {
            return;
        }

        if (!existsSync(`${pkg.baseDir}`)) {
            return;
        }

        let actions = pkg.yamlItem("cmd.shell");
        let envActions = pkg.yamlItem("cmd.env");
        if (envActions) {
            if (actions) {
                Array.prototype.push.apply(actions, envActions);
            } else {
                actions = envActions;
            }
        }

        if (!actions) {
            return;
        }

        log.info(`=== ENV ${pkg.name} - ${pkg.version}`);
        const loader = new Loader(this.config);
        for (let action of actions) {
            if (action.startsWith("levainShell")) {
                // Potential infinite loop here!
                // TODO: REFACTOR THIS!
                let args: any = {};
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
            "cmd /u " + (this.interactive ? "/k" : "/c"),
            (this.interactive ? "cls" : undefined),
            this.addPath(),
            (this.interactive ? 'prompt [levain]$P$G' : undefined),
            (this.interactive ?  undefined : args._.join(" "))
        );
        log.info(`- CMD - ${cmd}`);

        let opt: any = {};
        opt.cmd = cmd.split(" ");
        opt.env = {}

        this.setEnv(opt.env);
        if (this.config.levainHome) {
            opt.env["levainHome"] = this.config.levainHome;
        }

        if (this.saveVar) {
            opt.stdout = 'piped';
        }

        // if (detached) {
        //     // FIXME: https://github.com/denoland/deno/issues/5501
        //     opt.detached = true;
        //     Deno.run(opt);
        //     log.info("shell initiated");
        //     return;
        // }

        const p = Deno.run(opt);
        let status = await p.status();

        if (!this.ignoreErrors && !status.success) {
            log.error("CMD terminated with code " + status.code);
            Deno.exit(1);
        }

        if (this.saveVar) {
            let rawOutput = await p.output();
            let cmdOutput = new TextDecoder().decode(rawOutput);
            if (this.stripCRLF) {
                cmdOutput = cmdOutput
                    .replace(/\r\n$/, '')
                    .replace(/\r$/, '')
                    .replace(/\n$/, '');
            }
            this.config.setVar(this.saveVar, cmdOutput);
        }

        if (this.interactive) {
            log.info("");
            log.info("Levain - Goodbye!");
        }
    }

    private concatCmd(...parts: (string | undefined)[]): string {
        return this.concatCmdArr(parts);
    }

    private concatCmdArr(parts: (string | undefined)[]): string {
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
        let result: string = "";
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

    private addPath(): string | undefined {
        let myPath: string = this.config.context.action?.addpath?.path;
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
