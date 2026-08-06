import * as log from "@std/log";
import { existsSync } from "@std/fs";

import Action from "../action.ts";
import Package from "../../lib/package/package.ts";
import Config from "../../lib/config.ts";
import { parseArgs } from "../../lib/parse_args.ts";
import JsonUtils from "../../lib/utils/json_utils.ts";

export default class JsonSet implements Action {
  constructor(private config: Config) {
  }

  // deno-lint-ignore require-await
  async execute(_pkg: Package, parameters: string[]) {
    log.debug(`JSON-SET ${parameters.join(" ")}`);

    const myArgs = parseArgs(parameters, {
      stringOnce: [],
      stringMany: [],
      boolean: [
        "ifNotExists",
      ],
    });

    if (myArgs?._?.length < 3) {
      throw Error("Missing parameters. jsonSet [--ifNotExists] filename property value");
    }

    const filename = myArgs._[0];
    if (filename.startsWith("--")) {
      throw Error("Missing parameters. jsonSet [--ifNotExists] filename property value");
    }

    const property = myArgs._[1];
    if (property.startsWith("--")) {
      throw Error("Missing parameters. jsonSet [--ifNotExists] filename property value");
    }

    const value = myArgs._[2];
    if (value.startsWith("--")) {
      throw Error("Missing parameters. jsonSet [--ifNotExists] filename property value");
    }

    let json = {};
    if (existsSync(filename)) {
      json = JsonUtils.load(filename) || {};
    }
    const changed = JsonUtils.set(json, property, value, myArgs.ifNotExists);

    log.debug(`- json: ${JSON.stringify(json)}`);
    if (changed) {
      JsonUtils.save(filename, json);
      log.debug(`JSON-SET ${property} = ${value} at ${filename}`);
    } else {
      log.debug(`JSON-SET ${property} unchanged at ${filename}`);
    }
  }
}
