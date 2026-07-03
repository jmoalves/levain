import * as log from "@std/log";
import * as path from "@std/path";

import Config from "../../lib/config.ts";
import Package from "../../lib/package/package.ts";
import { parseArgs } from "../../lib/parse_args.ts";
import OsUtils from "../../lib/os/os_utils.ts";

import Action from "../action.ts";

export default class Mkdir implements Action {
  constructor(private config: Config) {
  }

  async execute(pkg: Package | undefined, parameters: string[]): Promise<void> {
    const args = parseArgs(parameters, {
      boolean: [
        "compact",
      ],
    });

    if (args._.length != 1) {
      throw "Action - mkdir - You should inform a single directory";
    }

    const dirname = pkg ? path.resolve(pkg.baseDir, args._[0]) : path.resolve(args._[0]);

    if (this.dirExists(dirname)) {
      return;
    }

    log.debug(`MKDIR ${dirname}`);
    Deno.mkdirSync(dirname, { recursive: true });

    if (args.compact) {
      await this.compactSync(dirname);
    }
  }

  private async compactSync(dirname: string) {
    if (!OsUtils.isWindows()) {
      log.warn(`MKDIR - ignoring --compact - Windows only`);
      return;
    }

    const windir = dirname.replace(/\//g, "\\");
    log.debug(`COMPACT ${windir}`);
    const cmd = `compact /q /c /s:${windir}`;

    const [exec, ...args] = OsUtils.parseCmd(cmd)
    
    const command = new Deno.Command(exec, {
      args,
      stdout: "null",
      stderr: "null",
    });

    await command.output();
  }

  private dirExists(dirname: string): boolean {
    try {
      const fileInfo = Deno.statSync(dirname);
      if (fileInfo.isDirectory) {
        return true;
      }

      if (fileInfo) {
        throw `Action - mkdir - ${dirname} already exists and it is not a directory`;
      }
    } catch (err) {
      if ((err instanceof Error) && (err.name != "NotFound")) {
        throw err;
      }
    }

    return false;
  }
}
