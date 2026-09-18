import * as log from "@std/log";
import type Package from "../../lib/package/package.ts";
import type Action from "../action.ts";
import { parseArgs } from "../../lib/parse_args.ts";
import type Config from "../../lib/config.ts";
import OsUtils from "../../lib/os/os_utils.ts";

export default class AddToStartupAction implements Action {
  constructor(private config: Config) {
  }

  async execute(_pkg: Package | undefined, parameters: string[]): Promise<void> {
    const args = parseArgs(parameters);
    const targetFile: string = args._[0];

    log.debug(`ADD-TO-STARTUP ${targetFile}`);
    return await OsUtils.addToStartup(targetFile);
  }
}
