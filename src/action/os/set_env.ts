import * as log from "@std/log";

import Config from "../../lib/config.ts";
import Package from "../../lib/package/package.ts";
import { parseArgs } from "../../lib/parse_args.ts";
import OsUtils from "../../lib/os/os_utils.ts";

import Action from "../action.ts";

export default class SetEnv implements Action {
  constructor(private config: Config) {
  }

  async execute(_pkg: Package | undefined, parameters: string[]): Promise<void> {
    const myArgs = parseArgs(parameters, {
      boolean: [
        "permanent",
      ],
    });

    if (myArgs?._?.length !== 2) {
      throw "You must inform the var and the value";
    }

    if (!this.config.context.action) {
      this.config.context.action = {};
    }

    if (!this.config.context.action.setEnv) {
      this.config.context.action.setEnv = {};
    }

    if (!this.config.context.action.setEnv.env) {
      this.config.context.action.setEnv.env = {};
    }

    const key = myArgs?._[0];
    const value = myArgs?._[1];
    log.debug(`ENV ${key} = ${value}`);
    this.config.setVar(key, value);
    this.config.context.action.setEnv.env[key] = value;
    OsUtils.setEnv(key, value);

    if (myArgs["permanent"]) {
      await OsUtils.setEnvPermanent(key, value);
    }
  }
}
