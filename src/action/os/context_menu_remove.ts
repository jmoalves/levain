import * as log from "@std/log";

import Config from "../../lib/config.ts";
import Package from "../../lib/package/package.ts";
import { parseArgs } from "../../lib/parse_args.ts";
import Loader from "../../lib/loader.ts";

import Action from "../action.ts";

export default class ContextMenuRemoveAction implements Action {
  constructor(private config: Config) {
  }

  async execute(pkg: Package | undefined, parameters: string[]) {
    log.debug(`CONTEXT-MENU ${parameters}`);

    if (!parameters || parameters.length < 1 || parameters[0] != "folders") {
      throw "contextMenu - You must inform the 'folders' sub action";
    }

    parameters.shift(); // remove the folders sub action
    const args = parseArgs(parameters, {
      stringOnce: [
        "id",
        "name",
        "cmd",
      ],
    });

    log.debug(`- ARGS: ${JSON.stringify(args)}`);

    if (!args.id || args.id.length == 0) {
      throw "contextMenu - You must inform the 'id' option";
    }

    if (args.id.includes(" ")) {
      throw "contextMenu - The 'id' option must NOT contain spaces";
    }

    if (!pkg) {
      throw Error("No package for action contextMenu");
    }

    const tempFilename = await this.templateRegistry(pkg, args);
    await this.regImport(pkg, args, tempFilename);
  }

  private async templateRegistry(pkg: Package, args: any) {
    const tempFilename = Deno.makeTempFileSync({ prefix: "levain-temp-" });
    log.debug(`- tempReg - ${tempFilename}`);
    const action =
      `template --replace=/@@shellID@@/g --with="${args.id}" --doubleBackslash \${pkg.levain.recipesDir}/levain-shell-remove.reg ${tempFilename}`;
    const loader = new Loader(this.config);
    await loader.action(pkg, action);

    return tempFilename;
  }

  private async regImport(pkg: Package, _args: any, tempFilename: string) {
    const action = `levainShell reg import ${tempFilename}`;
    const loader = new Loader(this.config);
    await loader.action(pkg, action);

    //Deno.removeSync(tempFilename);
  }
}
