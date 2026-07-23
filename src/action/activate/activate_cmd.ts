import Package from "../../lib/package/package.ts";
import Config from "../../lib/config.ts";
import Action from "../action.ts";
import { parseArgs } from "../../lib/parse_args.ts";
import { OsShell } from "../../lib/os/os_shell.ts";
import Shell from "../../cmd/shell.ts";

export default class ActivateCmd implements Action {
  constructor(private config: Config) {
  }

  async execute(_pkg: Package | undefined, parameters: string[]) {
    const myArgs = parseArgs(parameters, {
      stringOnce: [
        "shell",
      ],
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
    const shellTool = myArgs["shell"] || "cmd"
    this.emitEnv(env, shellTool);
    if (shellTool == "cmd" && (Deno.env.get("LEVAIN_LUA_LOADED") == undefined)) {
      console.log(`set "PROMPT=[%LEVAIN_CURRENT%] %_LEVAIN_OLD_PROMPT%"`);
    }
  }

  emitEnv(env: Record<string, string>, shell: string) {
    for (const [key, value] of Object.entries(env)) {
      switch (shell) {
        case "powershell":
          console.log(`$env:${key} = "${(value as string).replace(/"/g, '`"')}"`);
          break;

        case "cmd":
          console.log(`set ${key}=${value}`);
          break;

        case "bash":
          console.log(`export ${key}=${JSON.stringify(value)}`);
          break;
      }
    }
  }
}
