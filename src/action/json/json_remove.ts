import * as log from "@std/log";

import type Action from "../action.ts";
import type Package from "../../lib/package/package.ts";
import type Config from "../../lib/config.ts";
import { parseArgs } from "../../lib/parse_args.ts";
import { FileUtils } from "../../lib/fs/file_utils.ts";
import JsonUtils from "../../lib/utils/json_utils.ts";

export default class JsonRemove implements Action {
  constructor(_config: Config) {
  }

  // deno-lint-ignore require-await
  async execute(_pkg: Package | undefined, parameters: string[]) {
    log.debug(`JSON-REMOVE ${parameters.join(" ")}`);

    const myArgs = parseArgs(parameters, {
      stringOnce: [],
      stringMany: [],
      boolean: [],
      stopEarly: true,
    });

    if (!myArgs?._ || myArgs._.length !== 2) {
      throw new Error("Missing parameters. jsonRemove filename property");
    }

    const filename: string = myArgs._[0];
    const property: string = myArgs._[1];

    if (!FileUtils.exists(filename)) {
      log.debug(`JSON-REMOVE skipping, file does not exist: ${filename}`);
      return;
    }

    const json = JsonUtils.load(filename);
    const removed = JsonUtils.remove(json, property);
    if (removed) {
      JsonUtils.save(filename, json);
    }
  }
}
