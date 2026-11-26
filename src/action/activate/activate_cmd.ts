import type Package from "../../lib/package/package.ts";
import type Config from "../../lib/config.ts";
import type Action from "../action.ts";
import { parseArgs } from "../../lib/parse_args.ts";
import { OsShell } from "../../lib/os/os_shell.ts";
import OsUtils from "../../lib/os/os_utils.ts";
import Shell from "../../cmd/shell.ts";

export default class ActivateCmd implements Action {
  constructor(private config: Config) {
  }

  async execute(_pkg: Package | undefined, parameters: string[]) {
    const myArgs = parseArgs(parameters, {
      stringOnce: [
        "shell",
      ],
      stopEarly: false,
    });
    const shell = new Shell(this.config);
    const { pkgNames, pkgActions, curDirPkg } = await shell.readPackages(myArgs?._);
    const osShell: OsShell = new OsShell(this.config, pkgNames, true);
    osShell.interactive = true;
    // Execute cmd.shell and cmd.env actions supressing output
    const originalLog = console.log;
    const originalError = console.error;
    try {
      console.log = () => {};
      console.error = () => {};
      await shell.runShell(osShell, curDirPkg, pkgActions, false);

      // code that produces output
     } finally {
      console.log = originalLog;
      console.error = originalError;
    }
    const env: Record<string, string> = {};
    await osShell.prepareEnv(env);
    const shellTool = myArgs["shell"] || "cmd";
    this.emitEnv(env, shellTool);
    if (shellTool == "cmd" && (Deno.env.get("LEVAIN_LUA_LOADED") == undefined)) {
      const current = env["LEVAIN_CURRENT"] ?? "";
      const oldPrompt = Deno.env.get("_LEVAIN_OLD_PROMPT") ?? "$P$G";
      this.emitEnv({ PROMPT: `[${current}] ${oldPrompt}` }, "cmd");
    }
  }

  emitEnv(env: Record<string, string>, shell: string) {
    for (const [key, value] of Object.entries(env)) {
      if (/[\r\n\0]/.test(key) || /[\r\n\0]/.test(value)) {
        throw new Error(`Environment variable "${key}" must not contain CR, LF, or NUL characters`);
      }

      switch (shell) {
        case "powershell": {
          if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(key)) {
            throw new Error(`Invalid environment variable name for powershell: ${key}`);
          }
          const target = /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? `$env:${key}` : `\${env:${key}}`;
          // PowerShell treats ASCII ' and Unicode single quotes U+2018-U+201B as single-quote delimiters
          const escaped = value.replace(/['\u2018\u2019\u201a\u201b]/g, "$&$&");
          console.log(`${target} = '${escaped}'`);
          break;
        }

        case "cmd": {
          if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(key)) {
            throw new Error(`Invalid environment variable name for cmd: ${key}`);
          }
          if (!value.includes('"')) {
            console.log(`set "${key}=${value.replaceAll("%", "%%")}"`);
          } else {
            const escaped = value
              .replaceAll("%", "%%")
              .replaceAll("^", "^^")
              .replaceAll("&", "^&")
              .replaceAll("|", "^|")
              .replaceAll("<", "^<")
              .replaceAll(">", "^>")
              .replaceAll("(", "^(")
              .replaceAll(")", "^)")
              .replaceAll('"', '^"');
            console.log(`set ${key}=${escaped}`);
          }
          break;
        }

        case "bash": {
          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
            throw new Error(`Invalid environment variable name for bash: ${key}`);
          }
          const isWindowsPath = OsUtils.isWindows() && key.toUpperCase() === "PATH";
          const bashKey = isWindowsPath ? "PATH" : key;
          const bashVal = isWindowsPath ? ActivateCmd.windowsPathListToBash(value) : value;
          console.log(`export ${bashKey}='${bashVal.replaceAll("'", "'\\''")}'`);
          break;
        }

        default:
          throw new Error(`Unsupported shell: ${shell}`);
      }
    }
  }

  /**
   * Converts a Windows semicolon-delimited PATH string into a POSIX colon-delimited
   * PATH suitable for Git Bash / MSYS2 (e.g. `C:\tools\bin;D:\jdk\bin` -> `/c/tools/bin:/d/jdk/bin`).
   */
  static windowsPathListToBash(pathValue: string): string {
    return pathValue
      .split(";")
      .map((raw) => raw.trim().replace(/^"+|"+$/g, ""))
      .filter((entry) => entry.length > 0)
      .map((entry) => {
        const forward = entry.replaceAll("\\", "/");
        const driveMatch = /^([A-Za-z]):(\/.*)?$/.exec(forward);
        if (driveMatch) {
          const drive = driveMatch[1].toLowerCase();
          const rest = driveMatch[2] ?? "";
          return `/${drive}${rest}`;
        }
        return forward;
      })
      .join(":");
  }
}
