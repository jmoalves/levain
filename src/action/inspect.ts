import * as log from "@std/log";
import * as path from "@std/path";

import type Config from "../lib/config.ts";
import type Package from "../lib/package/package.ts";
import { parseArgs } from "../lib/parse_args.ts";
import { assertNotReservedVarName } from "../lib/reserved_words.ts";

import type Action from "./action.ts";
import { FileUtils } from "../lib/fs/file_utils.ts";

export default class Inspect implements Action {
  constructor(private config: Config) {
  }

  // deno-lint-ignore require-await
  async execute(_pkg: Package | undefined, parameters: string[]) {
    const args = parseArgs(parameters, {
      stringMany: [
        "regExp",
        "saveVar",
      ],
      stopEarly: false,
    });

    this.verifyArgs(args); // throws

    const src = path.resolve(Deno.cwd(), args._[0]);

    log.debug(`INSPECT ${src}`);
    const data = FileUtils.readTextFileSync(src);
    for (const index in args.regExp) {
      const regexp = args.regExp[index];
      const varName = args.saveVar[index];

      const pattern = regexp.replace(/^\/(.+)\/([a-z]*)$/, "$1");
      const flags = regexp.replace(/^\/(.+)\/([a-z]*)$/, "$2");

      log.debug(`- INSPECT[rxp] /${pattern}/${flags} => ${varName}`);
      const matchArray = data.match(new RegExp(pattern, flags));

      if (!matchArray) {
        throw new Error(`${regexp} not found at ${src}`);
      }

      // FIXME: Check if regExp has match group or not...
      const value = matchArray[1] || matchArray[0];
      log.debug(`- INSPECT[rxp] /${pattern}/${flags} = ${value}`);
      this.config.setVar(varName, value);
    }
  }

  private verifyArgs(args: any): void {
    if (!args.regExp || args.regExp.length == 0) {
      throw new Error("What do you need to search?");
    }

    if (!args.saveVar || args.saveVar.length == 0) {
      throw new Error("Where should we put the result?");
    }

    if (args.regExp.length != args.saveVar.length) {
      throw new Error("There is a mismatch between --regExp and --saveVar");
    }

    if (!args._ || args._.length != 1) {
      throw new Error("Inform the source file");
    }

    for (const x in args.regExp) {
      if (args.regExp[x].search(/^\/(.+)\/([a-z]*)$/) == -1) {
        throw new Error("You must use regExps - " + args.regExp[x]);
      }
    }

    for (const varName of args.saveVar) {
      assertNotReservedVarName(varName, "inspect");
    }
  }
}
