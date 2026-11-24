import * as log from "@std/log";

import type Config from "../../lib/config.ts";
import { FileUtils } from "../../lib/fs/file_utils.ts";
import OsUtils from "../../lib/os/os_utils.ts";
import type Package from "../../lib/package/package.ts";
import { parseArgs } from "../../lib/parse_args.ts";

import type Action from "../action.ts";

const VALID_ID_REGEX = /^[A-Za-z0-9._-]+$/;

function escapeRegString(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

export default class ContextMenuAction implements Action {
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
        "icon",
      ],
      stopEarly: false,
    });

    log.debug(`- ARGS: ${JSON.stringify(args)}`);

    if (!args.id || args.id.length == 0) {
      throw "contextMenu - You must inform the 'id' option";
    }

    if (!args.name || args.name.length == 0) {
      throw "contextMenu - You must inform the 'name' option";
    }

    if (!args.cmd || args.cmd.length == 0) {
      throw "contextMenu - You must inform the 'cmd' option";
    }

    if (args.id.includes(" ")) {
      throw "contextMenu - The 'id' option must NOT contain spaces";
    }

    if (!VALID_ID_REGEX.test(args.id)) {
      throw new Error(`contextMenu - Invalid characters in 'id' option: ${args.id}`);
    }

    const icon = args.icon ?? "";
    for (const [label, value] of [["name", args.name], ["cmd", args.cmd], ["icon", icon]]) {
      if (/[\r\n\0]/.test(value)) {
        throw new Error(`contextMenu - The '${label}' option must not contain CR, LF, or NUL characters`);
      }
    }

    if (!pkg) {
      throw Error("No package for action contextMenu");
    }

    const tempFilename = Deno.makeTempFileSync({ prefix: "levain-temp-", suffix: ".reg" });
    try {
      await this.templateRegistry(pkg, { ...args, icon }, tempFilename);
      await this.regImport(tempFilename);
    } finally {
      OsUtils.removeFile(tempFilename);
    }
  }

  private async templateRegistry(pkg: Package, args: { id: string; name: string; cmd: string; icon: string }, tempFilename: string) {
    log.debug(`- tempReg - ${tempFilename}`);
    const templatePath = await this.config.replaceVars("${pkg.levain.recipesDir}/levain-shell.reg", pkg.name);
    let data = FileUtils.readTextFileSync(templatePath);
    data = data
      .replace(/@@shellID@@/g, () => args.id)
      .replace(/@@shellName@@/g, () => escapeRegString(args.name))
      .replace(/@@shellCmd@@/g, () => escapeRegString(args.cmd))
      .replace(/@@shellIcon@@/g, () => escapeRegString(args.icon));
    FileUtils.writeTextFileSync(tempFilename, data);
  }

  private async regImport(tempFilename: string) {
    await OsUtils.runAndLog(["reg", "import", tempFilename]);
  }
}
