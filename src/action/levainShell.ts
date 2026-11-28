import * as log from "@std/log";

import type Config from "../lib/config.ts";
import type Package from "../lib/package/package.ts";
import { parseArgs, type ShellToken } from "../lib/parse_args.ts";
import { assertNotReservedVarName } from "../lib/reserved_words.ts";
import { OsShell } from "../lib/os/os_shell.ts";

import type Action from "./action.ts";

const LEVAIN_SHELL_PARSE_OPTS = {
  stringOnce: [
    "saveVar",
  ],
  boolean: [
    "stripCRLF",
    "ignoreErrors",
  ],
};

export default class LevainShell implements Action {
  constructor(private config: Config) {
  }

  async execute(pkg: Package | undefined, parameters: string[]) {
    if (!pkg) {
      throw Error("No package for action levainShell");
    }

    log.debug(`LEVAIN-SHELL ${pkg.name} ${JSON.stringify(parameters)}`);

    const myArgs = parseArgs(parameters, LEVAIN_SHELL_PARSE_OPTS);
    const osShell = this.createOsShell(pkg, myArgs);
    await osShell.execute(myArgs._);
  }

  async executeShellTokens(pkg: Package | undefined, tokens: ShellToken[]) {
    if (!pkg) {
      throw Error("No package for action levainShell");
    }

    log.debug(`LEVAIN-SHELL ${pkg.name} ${JSON.stringify(tokens.map((t) => t.value))}`);

    const { optionArgs, commandTokens } = LevainShell.splitLeadingOptions(tokens);
    const myArgs = parseArgs(optionArgs, LEVAIN_SHELL_PARSE_OPTS);
    const osShell = this.createOsShell(pkg, myArgs);
    osShell.shellTokens = commandTokens;
    await osShell.execute(commandTokens.map((t) => t.value));
  }

  private createOsShell(pkg: Package, myArgs: any): OsShell {
    if (myArgs.saveVar) {
      assertNotReservedVarName(myArgs.saveVar, "levainShell");
    }

    const osShell: OsShell = new OsShell(this.config, [pkg.name]);
    osShell.saveVar = myArgs.saveVar;
    osShell.interactive = false;
    osShell.stripCRLF = myArgs.stripCRLF;
    osShell.ignoreErrors = myArgs.ignoreErrors;
    return osShell;
  }

  private static splitLeadingOptions(
    tokens: ShellToken[],
  ): { optionArgs: string[]; commandTokens: ShellToken[] } {
    const optionArgs: string[] = [];
    let index = 0;

    while (index < tokens.length) {
      const token = tokens[index];
      if (token.isOperator || !token.value.startsWith("-")) {
        break;
      }
      if (token.value === "--") {
        index++;
        break;
      }
      optionArgs.push(token.value);
      index++;
      // Consume separate option value for `--saveVar <name>` (not `--saveVar=<name>`)
      if (token.value === "--saveVar" && index < tokens.length && !tokens[index].isOperator) {
        optionArgs.push(tokens[index].value);
        index++;
      }
    }

    const commandTokens = tokens.slice(index).map((t, i) => (i === 0 ? { ...t, precededBySpace: true } : t));
    return { optionArgs, commandTokens };
  }
}
