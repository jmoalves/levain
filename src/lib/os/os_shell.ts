import * as log from "jsr:@std/log";

import LevainVersion from "../../levain_version.ts";
import Config from "../config.ts";
import Package from "../package/package.ts";
import Loader from '../loader.ts';

import OsUtils from "./os_utils.ts";
import StringUtils from "../utils/string_utils.ts";

export class OsShell {
    private readonly dependencies: Package[];
    private _interactive: boolean = false;
    private _varName: string | undefined = undefined;
    private _ignoreErrors: boolean = false;
    private _stripCRLF: boolean = false;

    constructor(
        private config: Config,
        private pkgNames: string[],
        installedOnly = false
    ) {
        // if (!pkgNames || pkgNames.length == 0) {
        //     throw new Error("No package");
        // }

        let pkgs: Package[] | null = this.config?.packageManager?.resolvePackages(pkgNames, installedOnly, false);
        if (!pkgs) {
            throw new Error("Unable to load dependencies for a Levain shell. Aborting...");
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

        log.debug(`=== ENV ${pkg.name} - ${pkg.version}`);
        const loader = new Loader(this.config);
        for (let action of actions) {
            // Infinite loop protection - https://github.com/jmoalves/levain/issues/111
            if (action.startsWith('levainShell ')) {
                throw new Error(`levainShell action is not allowed here. Check your recipe - pkg: ${pkg.name} action: ${action}`)
            }

            await loader.action(pkg, action);
        }
    }

    async openShell(args: string[]) {
        // TODO: Handle other os's
        OsUtils.onlyInWindows()
        let cmd = this.prepareShellOptions(args);

        const p = cmd.outputSync();

        if (!this.ignoreErrors && !p.success) {
            throw new Error("CMD terminated with code " + p.code);
        }

        if (this.saveVar) {
            const rawOutput = await p.stdout;
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

    prepareShellOptions(args: string[]): Deno.Command {
        let myArgs: string[]
        if (this.interactive) {
            if (this.config.shellPath) {
                myArgs = StringUtils.splitSpaces(
                    `/c start ${this.config.shellPath}`
                )
            } else {
                myArgs = StringUtils.splitSpaces(
                    `/c start cmd /u /k prompt [levain${this.versionTag()}]$P$G`
                )
            }
        } else {
            myArgs = StringUtils.splitSpaces(
                'cmd /u   /c '
            ).concat(args)
        }

        const opt: Deno.CommandOptions = {
            args: myArgs
        }
        opt.env = {}

        this.setEnv(opt.env);
        if (this.config.levainHome) {
            opt.env["levainHome"] = this.config.levainHome;
        }

        const myPath = this.getCmdPath();
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

        const cmd = new Deno.Command('cmd',opt)
        log.debug(`- CMD - cmd ${myArgs}`);

        return cmd;
    }

    static adjustArgs(args: string[]) {
        const QUOTATION_MARK = '"'

        return args.map(arg => {
            let adjusted = arg
            if (arg.includes(' ')) {
                adjusted = StringUtils.surround(arg, QUOTATION_MARK)
            }
            return adjusted
        })
    }

    private versionTag(): string {
        let myVersion = LevainVersion.levainVersion;
        if (!myVersion) {
            return '';
        }

        return '-' + myVersion;
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

        myPath.reverse(); // Issue https://github.com/jmoalves/levain/issues/115
        myPath.unshift(this.config.levainBaseDir);
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
