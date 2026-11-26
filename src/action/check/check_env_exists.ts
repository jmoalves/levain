import * as log from "@std/log";

import type Config from "../../lib/config.ts";
import t from "../../lib/i18n.ts";
import OsUtils from "../../lib/os/os_utils.ts";
import type Package from "../../lib/package/package.ts";
import { parseArgs } from "../../lib/parse_args.ts";

import type Action from "../action.ts";

export default class CheckEnvExists implements Action {
  constructor(private config: Config) {
  }

  // deno-lint-ignore require-await
  async execute(_pkg: Package | undefined, parameters: string[]): Promise<void> {
    const args = parseArgs(parameters, {});

    if (!args._ || args._.length < 1) {
      throw new Error(t("action.check_env_exists.missingArgs"));
    }

    const envNames: string[] = args._;
    log.debug(`CHECK-ENV-EXISTS ${envNames.join(", ")}`);

    for (const name of envNames) {
      const value = this.lookupEnv(name);
      if (value !== undefined && value.trim().length > 0) {
        log.debug(`FOUND ENV ${name}`);
        return;
      }
    }

    if (envNames.length === 1) {
      throw new Error(t("action.check_env_exists.notFound", { name: envNames[0] }));
    }

    throw new Error(t("action.check_env_exists.noneFound", { names: envNames.join(", ") }));
  }

  private lookupEnv(name: string): string | undefined {
    const sessionEnv: Record<string, string> | undefined = this.config.context?.action?.setEnv?.env;
    if (sessionEnv) {
      if (Object.hasOwn(sessionEnv, name)) {
        return sessionEnv[name];
      }
      if (OsUtils.isWindows()) {
        const lower = name.toLowerCase();
        for (const [k, v] of Object.entries(sessionEnv)) {
          if (k.toLowerCase() === lower) {
            return v;
          }
        }
      }
    }

    const configVal = this.config.getVar(name);
    if (configVal !== undefined && configVal.trim().length > 0) {
      return configVal;
    }

    return Deno.env.get(name);
  }
}
