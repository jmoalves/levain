import { join } from "@std/path";

import Package from "../../lib/package/package.ts";
import Config from "../../lib/config.ts";

import { parseArgs } from "../../lib/parse_args.ts";
import Action from "../action.ts";

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
      ]
    });
    const levainCmdPath = myArgs.dev ? Deno.cwd() : join(this.config.levainHome, "levain");
    if (myArgs["cmd"]) {
        const cmdInitializer = new CmdInitializer(levainCmdPath,  this.config.levainConfigDir);
        await cmdInitializer.install();
    }
    if (myArgs["bash"]) {
        const bashInitializer = new BashInitializer(levainCmdPath);
        await bashInitializer.install();
    }
    if (myArgs["powershell"]) {
        const powershellInitializer = new PowershellInitializer(levainCmdPath, myArgs["powershell-profile"]);
        await powershellInitializer.install();
    }
    if (myArgs["cmder"]) {
        const cmderInitializer = new CmderInitializer(levainCmdPath, myArgs["cmder-config"]);
        await cmderInitializer.install();
    }
  }
}
