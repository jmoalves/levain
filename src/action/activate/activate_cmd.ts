import Package from "../../lib/package/package.ts";
import Config from "../../lib/config.ts";
import Action from "../action.ts";
import { parseArgs } from "../../lib/parse_args.ts";
import { OsShell } from "../../lib/os/os_shell.ts";

export default class ActivateCmd implements Action {
  constructor(private config: Config) {
  }

  async execute(_pkg: Package | undefined, parameters: string[]) {
    const myArgs = parseArgs(parameters, {
      stringOnce: [
        "shell",
      ],
    });
    let pkgNames = myArgs?._;
    let curDirPkg = undefined;

    if (pkgNames.length == 0) {
      curDirPkg = await this.config.repositoryManager.currentDirPackage();
      if (curDirPkg && curDirPkg.dependencies && curDirPkg.dependencies.length > 0) {
        pkgNames = curDirPkg.dependencies;
      } else {
        pkgNames = [this.config.defaultPackage];
      }
    }
    await this.config.repositoryManager.reload();


    // Running shell
    const osShell: OsShell = new OsShell(this.config, pkgNames, true);
    osShell.interactive = true;
    const env: Record<string, string> = {};
    await osShell.prepareEnv(env);
    const shell = myArgs["shell"] || "cmd"
    this.emitEnv(env, shell);
    if (shell == "cmd" && (Deno.env.get("LEVAIN_LUA_LOADED") == undefined)) {
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
