import * as log from "@std/log";

import Action from "../action.ts";
import Package from "../../lib/package/package.ts";
import { parseArgs } from "../../lib/parse_args.ts";
import Config from "../../lib/config.ts";

import PropertiesUtils from "./properties_utils.ts";

export default class PropertyGetAction implements Action {
  constructor(
    private config: Config,
  ) {
  }

  // deno-lint-ignore require-await
  async execute(_pkg: Package, parameters: string[]) {
    log.debug(`PROPERTY-GET ${parameters.join(" ")}`);

    const myArgs = parseArgs(parameters, {
      stringOnce: [
        "setVar",
        "default",
      ],
      stringMany: [],
      boolean: [],
    });

    const filePath = myArgs._[0];
    const propertyName = myArgs._[1];
    const properties = PropertiesUtils.load(filePath);
    const value = properties.get(propertyName);
    this.config.setVar(myArgs.setVar, value || "");
  }
}
