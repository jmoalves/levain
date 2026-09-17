import * as log from "@std/log";

import type Config from "../lib/config.ts";
import type Package from "../lib/package/package.ts";

import type Action from "./action.ts";

export default class DefaultPackage implements Action {
  constructor(private config: Config) {
  }

  // deno-lint-ignore require-await
  async execute(_pkg: Package | undefined, parameters: string[]): Promise<void> {
    if (parameters.length != 1) {
      throw `You must inform one package ${parameters}`;
    }

    const pkgName = parameters[0];
    log.debug(`DEFAULT-PACKAGE ${pkgName}`);
    this.config.defaultPackage = pkgName;
  }
}
