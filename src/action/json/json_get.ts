import * as log from "@std/log";

import Action from "../action.ts";
import Package from "../../lib/package/package.ts";
import Config from "../../lib/config.ts";
import { parseArgs } from "../../lib/parse_args.ts";
import JsonUtils from "../../lib/utils/json_utils.ts";

export default class JsonGet implements Action {
  constructor(private config: Config) {
  }

  // deno-lint-ignore require-await
  async execute(_pkg: Package, parameters: string[]) {
    log.debug(`JSON-GET ${parameters.join(" ")}`);

    const myArgs = parseArgs(parameters, {
      stringOnce: [
        "setVar",
        "default",
      ],
      stringMany: [],
      boolean: [],
    });

    if (myArgs?._?.length < 2) {
      throw Error("Missing parameters. jsonGet --setVar=VAR filename property");
    }

    if (!myArgs?.setVar) {
      throw Error("Missing parameters. jsonGet --setVar=VAR filename property");
    }

    const filename = myArgs._[0];
    if (filename.startsWith("--")) {
      throw Error("Missing parameters. jsonGet --setVar=VAR filename property");
    }

    const property = myArgs._[1];
    if (property.startsWith("--")) {
      throw Error("Missing parameters. jsonGet --setVar=VAR filename property");
    }

    const json = JsonUtils.load(filename);
    const value = JsonUtils.get(json, property, myArgs.default);

    if (Array.isArray(value)) {
      throw Error(`Could not retrieve an entire array property - "${property}"`);
    }

    if (typeof value === "object" && value !== null) {
      throw Error(`Could not retrieve an entire object property - "${property}"`);
    }

    this.config.setVar(myArgs.setVar, value);
  }
}
