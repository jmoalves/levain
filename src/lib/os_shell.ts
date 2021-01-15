import * as log from "https://deno.land/std/log/mod.ts";

import {existsSync} from "https://deno.land/std/fs/mod.ts";

import Config from "../lib/config.ts";
import Package from "../lib/package/package.ts";
import Loader from '../lib/loader.ts';
import OsUtils from "./os_utils.ts";

export class OsShell {
    private dependencies: Package[];
    private _interactive: boolean = false;
    private _varName: string | undefined = undefined;
    private _ignoreErrors: boolean = false;
    private _stripCRLF: boolean = false;

    constructor(private config: Config, private pkgNames: string[], installedOnly = false) {
        if (!pkgNames || pkgNames.length == 0) {
            throw new Error("No package");
        }

        let pkgs: Package[] | null = this.config.packageManager.resolvePackages(pkgNames, installedOnly, false);
        if (!pkgs) {
            throw new Error("Unable to load dependencies for a levain shell. Aborting...");
        }

        this.dependencies = pkgs;
    }

    set interactive(b: boolean) {
        this._interactive = b;
    }

    get interactive(): boolean {
        return this._interactive;
    }

    set saveVar(varName: string | undefined) {
        this._varName = varName;
    }

    get saveVar(): string | undefined {
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
        for (let pkg of this.dependencies) {
            await this.shellActions(pkg);
        }

        await this.openShell(args);
    }

    private async shellActions(pkg: Package) {
        if (!this.config) {
            return;
        }

        let actions = pkg.yamlItem("cmd.shell");
        let envActions = pkg.yamlItem("cmd.env");

        log.debug(`${pkg.name} SHELL actions: ${JSON.stringify(actions)}`);
        log.debug(`${pkg.name} ENV   actions: ${JSON.stringify(envActions)}`);

        if (envActions) {
            if (actions) {
                Array.prototype.push.apply(actions, envActions);
            } else {
                actions = envActions;
            }
        }

        log.debug(`${pkg.name} ALL   actions: ${JSON.stringify(actions)}`);
        if (!actions) {
            return;
        }

        log.info(`=== ENV ${pkg.name} - ${pkg.version}`);
        const loader = new Loader(this.config);
        for (let action of actions) {
            await loader.action(pkg, action);
        }
    }

    async openShell(args: string[]) {
        // TODO: Handle other os's
        if (!OsUtils.isWindows()) {
            throw `${Deno.build.os} not supported`;
        }

        let cmd = "";
        if (this.interactive) {
            if (this.config.shellPath) {
                cmd = `cmd /c start ${this.config.shellPath}`;
            } else {
                cmd = "cmd /c start cmd /u /k prompt [levain]$P$G";
            }
        } else {
            cmd = "cmd /u /c " + args.join(" ");
        }

        log.info(`- CMD - ${cmd}`);

        let opt: any = {};
        opt.cmd = cmd.split(" ");
        opt.env = {}

        this.setEnv(opt.env);
        if (this.config.levainHome) {
            opt.env["levainHome"] = this.config.levainHome;
        }

        let myPath = this.getCmdPath();
        if (myPath) {
            log.debug(`- PATH - ${myPath}`);
            opt.env["PATH"] = myPath;
        }

        if (this.dependencies) {
            let pkgNamesVar = this.dependencies.map(pkg => pkg.name).join(";");
            log.debug(`- LEVAIN_PKG_NAMES=${pkgNamesVar}`);
            opt.env["LEVAIN_PKG_NAMES"] = pkgNamesVar;
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
            throw new Error("CMD terminated with code " + status.code);
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

    private getCmdPath(): string | undefined {
        let myPath = this.config.context.action?.addpath?.path;
        if (!myPath) {
            return undefined;
        }

        myPath = [...new Set(myPath)]; // Remove duplicates
        let pathStr = myPath.join(";");
        let envPath = Deno.env.get("PATH");
        if (!envPath) {
            return pathStr;
        }

        return pathStr + ";" + envPath;
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
