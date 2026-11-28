import * as log from "@std/log";
import * as path from "@std/path";

import LevainVersion from "../../levain_version.ts";
import type Config from "../config.ts";
import type Package from "../package/package.ts";
import { resolvePackageActions } from "../package/package_actions.ts";
import Loader from "../loader.ts";
import LogUtils from "../logger/log_utils.ts";
import { isShellOperatorToken, type ShellToken } from "../parse_args.ts";

import OsUtils from "./os_utils.ts";
import StringUtils from "../utils/string_utils.ts";

const SECRET_ENV_PREFIX = "__LEVAIN_SECRET_";
const SEGMENT_RESET_OPERATORS = new Set(["|", "||", "&", "&&", "(", ")"]);

export class OsShell {
  private readonly dependencies: Package[];
  private _interactive: boolean = false;
  private _varName: string | undefined = undefined;
  private _ignoreErrors: boolean = false;
  private _stripCRLF: boolean = false;
  private _shellTokens: ShellToken[] | undefined = undefined;

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

  set shellTokens(tokens: ShellToken[] | undefined) {
    this._shellTokens = tokens;
  }

  get shellTokens(): ShellToken[] | undefined {
    return this._shellTokens;
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

    const shellActions = resolvePackageActions(pkg, "cmd.shell");
    const envActions = resolvePackageActions(pkg, "cmd.env");

    log.debug(`${pkg.name} SHELL actions: ${JSON.stringify(shellActions)}`);
    log.debug(`${pkg.name} ENV   actions: ${JSON.stringify(envActions)}`);

    const actions: string[] = [...shellActions, ...envActions];

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

  static streamDrainAfterExitMs = 250;

  async openShell(args: string[]) {
    // TODO: Handle other os's
    OsUtils.onlyInWindows();
    const opt = this._shellTokens
      ? await this.prepareShellOptionsFromTokens(this._shellTokens)
      : await this.prepareShellOptions(args);
    await this.runPreparedShell(opt);
  }

  private async runPreparedShell(opt: IShellOptions) {
    log.debug(
      `Deno.command: ${JSON.stringify(OsShell.redactShellOptionsForLog(opt, this.collectSecretCandidates()))}`,
    );

    const pcommand = new Deno.Command(opt.exec_cmd, opt);

    if (this.saveVar) {
      const { success, stdout, stderr, code } = await pcommand.output();
      const rawStdout = new TextDecoder().decode(stdout);
      const rawStderr = new TextDecoder().decode(stderr);
      OsShell.logCapturedText(rawStdout, (line) => log.debug(line), this.config);
      if (!this.ignoreErrors && !success) {
        OsShell.logCapturedText(rawStderr, (line) => log.error(line), this.config);
        throw new Error("CMD terminated with code " + code);
      }
      OsShell.logCapturedText(rawStderr, (line) => log.debug(line), this.config);
      let cmdOutput = rawStdout;
      if (this.stripCRLF) {
        cmdOutput = cmdOutput
          .replace(/\r\n$/, "")
          .replace(/\r$/, "")
          .replace(/\n$/, "");
      }
      this.config.setVar(this.saveVar, cmdOutput);
    } else {
      const child = pcommand.spawn();
      let status: Deno.CommandStatus;
      if (!this.interactive) {
        const drainController = new AbortController();
        const stdoutDone = OsShell.streamToLog(
          child.stdout,
          (line) => log.info(line),
          this.config,
          drainController.signal,
        );
        const stderrDone = OsShell.streamToLog(
          child.stderr,
          (line) => log.error(line),
          this.config,
          drainController.signal,
        );
        status = await child.status;
        // Wait briefly for remaining buffered output/EOF, then cancel open pipes
        // inherited by detached background child processes (e.g. proxy daemons).
        let drainTimer: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([
            Promise.all([stdoutDone, stderrDone]),
            new Promise<void>((resolve) => {
              drainTimer = setTimeout(() => {
                drainController.abort();
                resolve();
              }, OsShell.streamDrainAfterExitMs);
            }),
          ]);
        } finally {
          if (drainTimer !== undefined) {
            clearTimeout(drainTimer);
          }
        }
        await Promise.all([stdoutDone, stderrDone]);
      } else {
        status = await child.status;
      }
      if (!this.ignoreErrors && !status.success) {
        throw new Error("CMD terminated with code " + status.code);
      }
    }
  }

  static logCapturedText(
    text: string,
    logFn: (line: string) => void,
    config: Config | null,
  ): void {
    const trimmed = text.replace(/\r?\n$/, "");
    if (!trimmed) {
      return;
    }
    for (const line of trimmed.split(/\r?\n/)) {
      logFn(LogUtils.hidePassword(config, line));
    }
  }

  static async streamToLog(
    stream: ReadableStream<Uint8Array> | undefined,
    logFn: (line: string) => void,
    config: Config | null,
    signal?: AbortSignal,
  ): Promise<void> {
    if (!stream) {
      return;
    }
    const reader = stream.getReader();
    const onAbort = () => {
      reader.cancel().catch(() => {});
    };
    if (signal?.aborted) {
      onAbort();
    } else {
      signal?.addEventListener("abort", onAbort, { once: true });
    }
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          logFn(LogUtils.hidePassword(config, line));
        }
      }
    } catch (err) {
      if (!signal?.aborted) {
        throw err;
      }
    } finally {
      buffer += decoder.decode();
      if (buffer.length > 0) {
        logFn(LogUtils.hidePassword(config, buffer));
      }
      signal?.removeEventListener("abort", onAbort);
      reader.releaseLock();
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
    const tokens: ShellToken[] = args.map((value) => ({
      value,
      isOperator: isShellOperatorToken(value),
      precededBySpace: true,
    }));
    return await this.prepareShellOptionsFromTokens(tokens);
  }

  async prepareShellOptionsFromTokens(tokens: ShellToken[]): Promise<IShellOptions> {
    const opt: IShellOptions = {
      env: {},
      cmd: [],
      exec_cmd: "",
      args: [],
    };

    await this.prepareEnv(opt.env);

    let cmd: string[];
    if (this.interactive) {
      if (this.config.shellPath) {
        // Empty window title "" prevents `start` from treating a quoted shellPath as the title
        cmd = ["cmd", "/c", "start", "", this.config.shellPath];
      } else {
        cmd = ["cmd", "/c", "start", "cmd", "/k", "prompt", "[%LEVAIN_CURRENT%]", "%_LEVAIN_OLD_PROMPT%"];
      }
    } else {
      for (const token of tokens) {
        if (/[\r\n\0]/.test(token.value)) {
          throw new Error("Shell command arguments must not contain CR, LF, or NUL characters");
        }
      }

      const secretCandidates = this.collectSecretCandidates();
      const hasSecret = secretCandidates.length > 0 &&
        tokens.some((token) => !token.isOperator && secretCandidates.some((secret) => token.value.includes(secret)));
      const hasAttachedToken = tokens.some((token, index) => index > 0 && !token.precededBySpace);

      if (hasSecret) {
        let secretIndex = 0;
        let segmentCmd: string | undefined;
        const hasPipe = tokens.some((token) => token.isOperator && token.value === "|");
        const parts: Array<{ text: string; precededBySpace: boolean }> = [];

        for (let i = 0; i < tokens.length; i++) {
          const token = tokens[i];
          if (token.isOperator) {
            parts.push({ text: token.value, precededBySpace: token.precededBySpace });
            if (SEGMENT_RESET_OPERATORS.has(token.value)) {
              segmentCmd = undefined;
            }
            continue;
          }

          // When a `cmd.exe` builtin `echo` segment contains a secret, pack all operands of
          // that `echo` into a single ephemeral env var and emit `echo(!VAR!` (unquoted).
          // On a pipe (`|`), parent `cmd /v:on` expands `!VAR!` BEFORE spawning the left-side
          // pipe sub-shell (which would re-parse `&`, `^`, `|`, `<`, `>` in the password!), so
          // defer expansion into a dedicated `cmd /s /d /v:on /c "echo(^!VAR^!)"` sub-command.
          if (segmentCmd === undefined && /^echo[.(]?$/i.test(token.value)) {
            let end = i + 1;
            let echoHasSecret = false;
            while (end < tokens.length && !tokens[end].isOperator) {
              if (secretCandidates.some((secret) => tokens[end].value.includes(secret))) {
                echoHasSecret = true;
              }
              end++;
            }
            if (echoHasSecret) {
              const echoOperands = tokens.slice(i + 1, end);
              const echoText = echoOperands
                .map((op, idx) => (idx > 0 && op.precededBySpace ? " " : "") + op.value)
                .join("");
              const envVar = `${SECRET_ENV_PREFIX}${secretIndex++}`;
              opt.env[envVar] = echoText;
              const echoExpr = hasPipe
                ? `cmd /s /d /v:on /c "echo(^!${envVar}^!"`
                : `echo(!${envVar}!`;
              parts.push({ text: echoExpr, precededBySpace: token.precededBySpace });
              segmentCmd = token.value;
              i = end - 1;
              continue;
            }
          }

          const containsSecret = secretCandidates.some((secret) => token.value.includes(secret));
          if (containsSecret) {
            const envVar = `${SECRET_ENV_PREFIX}${secretIndex++}`;
            const isBatchTarget = segmentCmd !== undefined && /\.(?:cmd|bat)$/i.test(segmentCmd);
            if (isBatchTarget && token.value.includes('"')) {
              throw new Error(
                "Cannot safely pass a secret containing double quotes to a .cmd/.bat script; use ${levain.password | urlEncode} instead",
              );
            }
            // Escape embedded `"` and trailing `\` for MSVCRT CommandLineToArgvW inside `"!VAR!"`
            opt.env[envVar] = OsShell.escapeForWindowsQuotedArg(token.value);
            parts.push({ text: `"!${envVar}!"`, precededBySpace: token.precededBySpace });
            continue;
          }

          if (segmentCmd === undefined) {
            segmentCmd = token.value;
          }
          parts.push({
            text: OsShell.escapeNonSecretForDelayedCmd(token.value),
            precededBySpace: token.precededBySpace,
          });
        }

        const joined = parts.map((p, i) => (i > 0 && p.precededBySpace ? " " : "") + p.text).join("");
        // `/s` unconditionally strips the outer quotes; `/d` disables AutoRun; `/v:on` expands
        // `!__LEVAIN_SECRET_N!` after cmd.exe operator/metacharacter parsing (`&`, `^`, `|`, `<`, `>`, `%`).
        cmd = ["cmd", "/s", "/d", "/v:on", "/c", `"${joined}"`];
        opt.windowsRawArguments = true;
      } else if (hasAttachedToken) {
        const joined = tokens
          .map((token, i) => {
            const text = token.isOperator ? token.value : OsShell.escapeForPlainCmd(token.value);
            return (i > 0 && token.precededBySpace ? " " : "") + text;
          })
          .join("");
        cmd = ["cmd", "/s", "/d", "/c", `"${joined}"`];
        opt.windowsRawArguments = true;
      } else {
        // `/d` disables registry AutoRun so captured `--saveVar` stdout is never polluted;
        // omit `/u` so cmd builtins emit normal text instead of UTF-16LE decoded as UTF-8.
        cmd = ["cmd", "/d", "/c", ...tokens.map((t) => t.value)];
      }
    }

    log.debug(`- CMD - ${cmd}`);

    opt.cmd = cmd;
    [opt.exec_cmd, ...opt.args] = cmd;

    if (this.saveVar || !this.interactive) {
      opt.stdout = "piped";
      opt.stderr = "piped";
      if (!this.saveVar) {
        opt.stdin = "inherit";
      }
    } else {
      opt.stdout = "inherit";
      opt.stderr = "inherit";
      opt.stdin = "inherit";
    }

    return opt;
  }

  private static escapeForPlainCmd(arg: string): string {
    if (arg === "") {
      return '""';
    }
    if (/\s/.test(arg) || arg.includes('"')) {
      return `"${OsShell.escapeForWindowsQuotedArg(arg)}"`;
    }
    return arg;
  }

  private static escapeForWindowsQuotedArg(value: string): string {
    return value
      .replace(/(\\*)"/g, '$1$1\\"')
      .replace(/(\\+)$/, "$1$1");
  }

  private static escapeNonSecretForDelayedCmd(arg: string): string {
    if (arg === "") {
      return '""';
    }
    if (/\s/.test(arg) || arg.includes('"')) {
      // Under `/v:on` with `!` present on the line, cmd.exe interprets `^` even inside double quotes
      const escaped = OsShell.escapeForWindowsQuotedArg(arg)
        .replaceAll("^", "^^")
        .replaceAll("!", "^!");
      return `"${escaped}"`;
    }
    // Unquoted under `/v:on`: phase 1 halves carets before `!` and phase 5 consumes one `^` before `!`
    return arg.replace(/(\^*)!/g, (_m, carets: string) => "^".repeat(carets.length * 4 + 2) + "!");
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

  static redactShellOptionsForLog(opt: IShellOptions, secretCandidates: string[] = []): IShellOptions {
    const sortedSecrets = [...secretCandidates]
      .filter((s) => s.length > 0)
      .sort((a, b) => b.length - a.length);

    const redactedEnv: Record<string, string> = {};
    for (const [key, value] of Object.entries(opt.env)) {
      if (key.startsWith(SECRET_ENV_PREFIX)) {
        redactedEnv[key] = "******";
      } else {
        let masked = value;
        for (const secret of sortedSecrets) {
          masked = masked.replaceAll(secret, "******");
        }
        redactedEnv[key] = masked;
      }
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

    const pathStr = uniquePath.join(path.DELIMITER);
    const envPath = Deno.env.get("PATH");
    if (!envPath) {
      return pathStr;
    }

    return pathStr + path.DELIMITER + envPath;
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
