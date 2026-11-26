import * as log from "@std/log";

import type Action from "../action.ts";
import type Package from "../../lib/package/package.ts";
import { parseArgs } from "../../lib/parse_args.ts";
import { assertNotReservedVarName } from "../../lib/reserved_words.ts";
import type Config from "../../lib/config.ts";

import PropertiesUtils from "./properties_utils.ts";

export default class PropertyGetAction implements Action {
  constructor(
    private config: Config,
  ) {
  }

  // deno-lint-ignore require-await
  async execute(_pkg: Package | undefined, parameters: string[]) {
    log.debug(`PROPERTY-GET ${parameters.join(" ")}`);

    const myArgs = parseArgs(parameters, {
      stringOnce: [
        "setVar",
        "default",
      ],
      stringMany: [],
      boolean: [],
      stopEarly: false,
    });

    if (!myArgs?.setVar || !myArgs?._ || myArgs._.length < 2) {
      throw new Error("Missing parameters. propertyGet --setVar=VAR [--default=DEFAULT] filename property");
    }
    assertNotReservedVarName(myArgs.setVar, "propertyGet");

    const filePath = myArgs._[0];
    const propertyName = myArgs._[1];
    const properties = PropertiesUtils.load(filePath);
    const value = properties.get(propertyName);
    const resolved = value !== undefined && value !== "" ? value : (myArgs.default ?? "");
    this.config.setVar(myArgs.setVar, resolved);
  }
}
