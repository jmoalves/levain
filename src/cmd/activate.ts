import * as log from "@std/log";
import t from "../lib/i18n.ts";

import Config from "../lib/config.ts";

import Command from "./command.ts";

export default class Activate implements Command {
  constructor(private config: Config) {
  }

  // deno-lint-ignore require-await
  async execute(_args: string[]) {
    log.error(t("cmd.activate.installMissing"));
    log.error("levain _activate-machine init");
    Deno.exit(1);
  }
  
  readonly oneLineExample = t("cmd.activate.example");
}
