import * as log from "@std/log";
import t from "../lib/i18n.ts";

import type Config from "../lib/config.ts";
import { parseArgs } from "../lib/parse_args.ts";

import type Command from "./command.ts";
import Install from "./install.ts";

export default class Update implements Command {
  constructor(private config: Config) {
  }

  async execute(args: string[]) {
    const myArgs = parseArgs(args, {
      boolean: [
        "force",
      ],
      stopEarly: false,
    });

    let pkgNames: string[] = myArgs._;
    const isUpdateAll = pkgNames.length == 0;

    if (isUpdateAll) {
      const installedPkgs = this.config.repositoryManager.repositoryInstalled.listPackages();
      if (installedPkgs?.length > 0) {
        const regularRepo = this.config.repositoryManager.repository;
        const availableNames: string[] = [];
        for (const pkg of installedPkgs) {
          if (regularRepo.resolvePackage(pkg.name)) {
            availableNames.push(pkg.name);
          } else {
            log.warn(t("cmd.update.missingUpstream", { pkg: pkg.name }));
          }
        }
        if (availableNames.length === 0) {
          return;
        }
        pkgNames = availableNames;
      }
    }

    const installer = new Install(this.config);
    await installer.installPackages(pkgNames, {
      force: !!myArgs.force,
      noUpdate: false,
      promptForUpdates: false,
      strictMinVersion: true,
      skipUnneededEnv: isUpdateAll,
      isolateFailures: isUpdateAll,
    });
  }

  bkpTag(dt: Date = new Date()): string {
    return Install.bkpTag(dt);
  }

  readonly oneLineExample = t("cmd.update.example");
}
