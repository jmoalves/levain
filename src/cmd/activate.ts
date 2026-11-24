import * as log from "@std/log";
import t from "../lib/i18n.ts";

import type Config from "../lib/config.ts";

import type Command from "./command.ts";

export default class Activate implements Command {
  constructor(private config: Config) {
  }

  // deno-lint-ignore require-await
  async execute(_args: string[]) {
    const installMissing = t("cmd.activate.installMissing");
    log.error(installMissing);
    log.error("levain _activate-machine init");
    throw new Error(`${installMissing}\nlevain _activate-machine init`);
  }
  
  readonly oneLineExample = t("cmd.activate.example");
}
