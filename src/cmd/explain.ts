import * as log from "@std/log";

import t from "../lib/i18n.ts";

import Config from "../lib/config.ts";
import { parseArgs } from "../lib/parse_args.ts";
import Package from "../lib/package/package.ts";

import Command from "./command.ts";

/*
 * TODO:
 * - Handle password (don't ask, don't show)
 * - Show package sourceDir and baseDir
 */
export default class ExplainCommand implements Command {
  constructor(private config: Config) {
  }

  async execute(args: string[]): Promise<void> {
    const myArgs = parseArgs(args, {});
    const pkgNames: string[] = myArgs._;

    if (pkgNames.length == 0) {
      throw new Error(t("cmd.explain.nothing"));
    }

    const pkgs: Package[] | null = this.config.packageManager.resolvePackages(pkgNames);
    if (!pkgs) {
      throw new Error(t("cmd.explain.nothing"));
    }

    log.info("");
    log.info("-----------------");

    log.info("");
    log.info(`# levain explain ${pkgNames}`);
    log.info("");

    for (const pkg of pkgs) {
      log.info(`## levain install ${pkg.name}`);
      await this.listActions(pkg, "cmd.install");
      await this.listActions(pkg, "cmd.env");
      log.info("");
      log.info("");
    }

    log.info("");
    log.info("-----------------");
    log.info("");
  }

  // deno-lint-ignore require-await
  async listActions(pkg: Package, item: string) {
    const list = pkg.yamlItem(item);
    if (!list) {
      return;
    }

    log.info("");
    for (const action of list) {
      // const actionWithVars = await this.config.replaceVars(action, pkg.name)
      // log.info(`* ${actionWithVars}`)
      log.info(`* ${action}`);
    }
  }

  readonly oneLineExample = t("cmd.explain.example");
}
