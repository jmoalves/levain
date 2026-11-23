import * as log from "@std/log";

import LevainVersion from "../../levain_version.ts";
import type Config from "../config.ts";
import type Package from "../package/package.ts";
import Loader from "../loader.ts";

import OsUtils from "./os_utils.ts";
import StringUtils from "../utils/string_utils.ts";

const SECRET_ENV_PREFIX = "__LEVAIN_SECRET_";

export class OsShell {
  private readonly dependencies: Package[];
  private _interactive: boolean = false;
  private _varName: string | undefined = undefined;
  private _ignoreErrors: boolean = false;
  private _stripCRLF: boolean = false;

  constructor(
    private config: Config,
    private pkgNames: string[],
    installedOnly = false,
  ) {
    const pkgs: Package[] | null = this.config?.packageManager?.resolvePackages(pkgNames, installedOnly, false);
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

  async execute(args: string[], openShell: boolean = true) {
    for (const pkg of this.dependencies) {
      await this.shellActions(pkg);
    }

    if (openShell) {
      await this.openShell(args);
    }
  }

  private async shellActions(pkg: Package) {
    if (!this.config) {
      return;
    }

    const shellActions = pkg.yamlItem("cmd.shell");
    const envActions = pkg.yamlItem("cmd.env");

    log.debug(`${pkg.name} SHELL actions: ${JSON.stringify(shellActions)}`);
    log.debug(`${pkg.name} ENV   actions: ${JSON.stringify(envActions)}`);

    const actions: string[] = [
      ...(Array.isArray(shellActions) ? shellActions : []),
      ...(Array.isArray(envActions) ? envActions : []),
    ];

    log.debug(`${pkg.name} ALL   actions: ${JSON.stringify(actions)}`);
    if (actions.length === 0) {
      return;
    }

    log.debug(`=== ENV ${pkg.name} - ${pkg.version}`);
    const loader = new Loader(this.config);
    for (const action of actions) {
      // Infinite loop protection - https://github.com/jmoalves/levain/issues/111
      if (action.startsWith("levainShell ")) {
        throw new Error(
          `levainShell action is not allowed here. Check your recipe - pkg: ${pkg.name} action: ${action}`,
        );
      }

      await loader.action(pkg, action);
    }
  }

  async openShell(args: string[]) {
    // TODO: Handle other os's
    OsUtils.onlyInWindows();
    const opt = await this.prepareShellOptions(args);

    log.debug(`Deno.command: ${JSON.stringify(OsShell.redactShellOptionsForLog(opt))}`);

    const pcommand = new Deno.Command(opt.exec_cmd, opt);

    if (this.saveVar) {
      const { success, stdout, stderr, code } = await pcommand.output();
      if (!this.ignoreErrors && !success) {
        const errOutput = new TextDecoder().decode(stderr).trim();
        if (errOutput) {
          log.error(errOutput);
        }
        throw new Error("CMD terminated with code " + code);
      }
      let cmdOutput = new TextDecoder().decode(stdout);
      if (this.stripCRLF) {
        cmdOutput = cmdOutput
          .replace(/\r\n$/, "")
          .replace(/\r$/, "")
          .replace(/\n$/, "");
      }
      this.config.setVar(this.saveVar, cmdOutput);
    } else {
      const child = pcommand.spawn();
      const status = await child.status;
      if (!this.ignoreErrors && !status.success) {
        throw new Error("CMD terminated with code " + status.code);
      }
    }
  }

  public async prepareEnv(env: Record<string, string>) {
    this.setEnv(env);

    const curDirPkg = await this.config.repositoryManager.currentDirPackage();
    const myVersion = this.versionTag();
    env["LEVAIN_CURRENT"] = `levain${myVersion}` + (
      curDirPkg ? ` ${curDirPkg.name}` : ""
    );

    if (this.config.configPaths.levainHome != "<unset>") {
      env["levainHome"] = this.config.configPaths.levainHome;
    }

    const myPath = this.getCmdPath();
    if (myPath) {
      log.debug(`- PATH - ${myPath}`);
      env["PATH"] = myPath;
    }

    if (this.dependencies) {
      const pkgNamesVar = this.dependencies.map((pkg) => pkg.name).join(";");
      log.debug(`- LEVAIN_PKG_NAMES=${pkgNamesVar}`);
      env["LEVAIN_PKG_NAMES"] = pkgNamesVar;
    }
  }

  async prepareShellOptions(args: string[]): Promise<IShellOptions> {
    const opt: IShellOptions = {
      env: {},
      cmd: [],
      exec_cmd: "",
      args: [],
    };

    let cmd: string[];
    if (this.interactive) {
      if (this.config.shellPath) {
        // Empty window title "" prevents `start` from treating a quoted shellPath as the title
        cmd = ["cmd", "/c", "start", "", this.config.shellPath];
      } else {
        cmd = ["cmd", "/c", "start", "cmd", "/k", "prompt", "[%LEVAIN_CURRENT%]", "%_LEVAIN_OLD_PROMPT%"];
      }
    } else {
      const secretCandidates = this.collectSecretCandidates();
      const hasSecret = secretCandidates.length > 0 &&
        args.some((arg) => secretCandidates.some((secret) => arg.includes(secret)));

      if (hasSecret) {
        let secretIndex = 0;
        const escapedTokens = args.map((arg) => {
          if (secretCandidates.some((secret) => arg.includes(secret))) {
            const envVar = `${SECRET_ENV_PREFIX}${secretIndex++}`;
            opt.env[envVar] = arg;
            return `"!${envVar}!"`;
          }
          if (arg.includes(" ")) {
            return `"${arg.replaceAll("!", "^!")}"`;
          }
          return arg.replaceAll("!", "^^!");
        });

        // `/s` unconditionally strips the outer quotes; `/d` disables AutoRun; `/v:on` expands
        // `!__LEVAIN_SECRET_N!` after cmd.exe operator/metacharacter parsing (`&`, `^`, `|`, `<`, `>`, `%`).
        cmd = ["cmd", "/s", "/d", "/v:on", "/c", `"${escapedTokens.join(" ")}"`];
        opt.windowsRawArguments = true;
      } else {
        // `/d` disables registry AutoRun so captured `--saveVar` stdout is never polluted;
        // omit `/u` so cmd builtins emit normal text instead of UTF-16LE decoded as UTF-8.
        cmd = ["cmd", "/d", "/c", ...args];
      }
    }

    log.debug(`- CMD - ${cmd}`);

    opt.cmd = cmd;
    [opt.exec_cmd, ...opt.args] = cmd;
    await this.prepareEnv(opt.env);

    if (this.saveVar) {
      opt.stdout = "piped";
      opt.stderr = "piped";
    } else {
      opt.stdout = "inherit";
      opt.stderr = "inherit";
      opt.stdin = "inherit";
    }

    return opt;
  }

  private collectSecretCandidates(): string[] {
    const pw = this.config?.password;
    if (!pw) {
      return [];
    }
    const candidates = new Set<string>([
      pw,
      StringUtils.encodeUrlComponent(pw),
      encodeURIComponent(pw),
    ]);
    return [...candidates].filter((c) => c.length > 0);
  }

  static redactShellOptionsForLog(opt: IShellOptions): IShellOptions {
    const redactedEnv: Record<string, string> = {};
    for (const [key, value] of Object.entries(opt.env)) {
      redactedEnv[key] = key.startsWith(SECRET_ENV_PREFIX) ? "******" : value;
    }
    return {
      ...opt,
      env: redactedEnv,
    };
  }

  static adjustArgs(args: string[]) {
    const QUOTATION_MARK = '"';

    return args.map((arg) => {
      let adjusted = arg;
      if (arg.includes(" ")) {
        adjusted = StringUtils.surround(arg, QUOTATION_MARK);
      }
      return adjusted;
    });
  }

  public versionTag(): string {
    const myVersion = LevainVersion.levainVersion;
    if (!myVersion) {
      return "";
    }

    return "-" + myVersion;
  }

  private getCmdPath(): string | undefined {
    const myPath: string[] | undefined = this.config.context.action?.addpath?.path;
    if (!myPath) {
      return undefined;
    }

    // Do not mutate addpath.path in place (Issue https://github.com/jmoalves/levain/issues/115)
    const ordered = [
      this.config.configPaths.levainBaseDir,
      ...[...myPath].reverse(),
    ];
    const uniquePath = [...new Set(ordered)];

    const pathStr = uniquePath.join(";");
    const envPath = Deno.env.get("PATH");
    if (!envPath) {
      return pathStr;
    }

    return pathStr + ";" + envPath;
  }

  private setEnv(env: Record<string, string>): void {
    if (!this.config.context.action?.setEnv?.env) {
      return;
    }

    for (const key of Object.keys(this.config.context.action.setEnv.env)) {
      const value = this.config.context.action.setEnv.env[key];
      if (value) {
        env[key] = value;
      }
    }
  }
}

export interface IShellOptions {
  env: Record<string, string>;
  cmd: string[];
  exec_cmd: string;
  args: string[];
  windowsRawArguments?: boolean;
  stdout?: "piped" | "inherit" | "null" | undefined;
  stdin?: "piped" | "inherit" | "null" | undefined;
  stderr?: "piped" | "inherit" | "null" | undefined;
}
