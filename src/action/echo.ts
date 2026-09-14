import * as log from "@std/log";

import type Package from "../lib/package/package.ts";
import type Config from "../lib/config.ts";

import type Action from "./action.ts";

export default class Echo implements Action {
  constructor(_config: Config) {
  }

  // deno-lint-ignore require-await
  async execute(_pkg: Package | undefined, parameters: string[]) {
    log.debug(`ECHO ${parameters.join(" ")}`);
  }
}
