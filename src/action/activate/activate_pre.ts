import Package from "../../lib/package/package.ts";
import Config from "../../lib/config.ts";
import Shell from "../../cmd/shell.ts";
import Action from "../action.ts";
import { OsShell } from "../../lib/os/os_shell.ts";

export default class ActivatePre implements Action {
  constructor(private config: Config) {
  }

  async execute(_pkg: Package | undefined, parameters: string[]) {
    const shell = new Shell(this.config);
    const { pkgNames, pkgActions, curDirPkg } = await shell.readPackages(parameters);
    await shell.installPackages(pkgNames);
    const osShell: OsShell = new OsShell(this.config, pkgNames, true);
    osShell.interactive = true;
    await shell.runShell(osShell, curDirPkg, pkgActions, false);
  }
}
