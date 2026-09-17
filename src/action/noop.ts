import * as log from "@std/log";

import type Config from "../lib/config.ts";
import type Package from "../lib/package/package.ts";

import type Action from "./action.ts";

export default class Noop implements Action {
  constructor(private config: Config, private actionName: string) {
  }

  // deno-lint-ignore require-await
  async execute(_pkg: Package | undefined, parameters: string[]): Promise<void> {
    log.debug(`NOOP[${this.actionName}] ${parameters}`);
  }
}
