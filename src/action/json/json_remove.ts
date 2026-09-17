import * as log from "@std/log";

import type Action from "../action.ts";
import type Package from "../../lib/package/package.ts";
import type Config from "../../lib/config.ts";
import { parseArgs } from "../../lib/parse_args.ts";

export default class JsonRemove implements Action {
  constructor(_config: Config) {
  }

  // deno-lint-ignore require-await
  async execute(_pkg: Package, parameters: string[]) {
    log.debug(`JSON-REMOVE ${parameters.join(" ")}`);

    const _myArgs = parseArgs(parameters, {
      stringOnce: [],
      stringMany: [],
      boolean: [],
    });

    throw "not implemented yet";
  }
}
