import type Package from "../../lib/package/package.ts";
import type Config from "../../lib/config.ts";
import OsUtils from "../../lib/os/os_utils.ts";

import { parseArgs } from "../../lib/parse_args.ts";
import type Action from "../action.ts";

import PowershellInitializer from "../../lib/activate/powershell_initializer.ts";
import BashInitializer from "../../lib/activate/bash_initializer.ts";
import CmdInitializer from "../../lib/activate/cmd_initializer.ts";
import CmderInitializer from "../../lib/activate/cmder_initializer.ts";

export default class ActivateInit implements Action {
  constructor(private config: Config) {
  }

  async execute(_pkg: Package | undefined, parameters: string[]) {
    const myArgs = parseArgs(parameters, {
      boolean: [
        "dev",
        "cmd",
        "bash",
        "powershell",
        "cmder",
      ],
      stringOnce: [
        "powershell-profile",
        "cmder-config",
      ],
      stopEarly: false,
    });

    const wantPowershell = Boolean(myArgs.powershell || myArgs["powershell-profile"]);
    const wantCmder = Boolean(myArgs.cmder || myArgs["cmder-config"]);
    const hasExplicitShell = Boolean(myArgs.cmd || myArgs.bash || wantPowershell || wantCmder);
    const installCmd = hasExplicitShell ? Boolean(myArgs.cmd) : OsUtils.isWindows();
    const installBash = hasExplicitShell ? Boolean(myArgs.bash) : true;
    const installPowershell = hasExplicitShell ? wantPowershell : OsUtils.isWindows();
    const installCmder = wantCmder;

    const levainCmdPath = myArgs.dev ? Deno.cwd() : this.config.configPaths.levainBaseDir;
    if (installCmd) {
      const cmdInitializer = new CmdInitializer(levainCmdPath, this.config.configPaths.levainHookPath);
      await cmdInitializer.install();
    }
    if (installBash) {
      const bashInitializer = new BashInitializer(levainCmdPath);
      await bashInitializer.install();
    }
    if (installPowershell) {
      const powershellInitializer = new PowershellInitializer(levainCmdPath, myArgs["powershell-profile"]);
      await powershellInitializer.install();
    }
    if (installCmder) {
      const cmderInitializer = new CmderInitializer(levainCmdPath, myArgs["cmder-config"]);
      await cmderInitializer.install();
    }
  }
}
