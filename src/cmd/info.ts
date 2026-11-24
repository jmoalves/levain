import * as log from "@std/log";

import t from "../lib/i18n.ts";

import type Config from "../lib/config.ts";
import type Package from "../lib/package/package.ts";
import { parseArgs } from "../lib/parse_args.ts";

import type Command from "./command.ts";

export default class InfoCommand implements Command {
  constructor(private config: Config) {
  }

  // deno-lint-ignore require-await
  async execute(args: string[]) {
    const myArgs = parseArgs(args, {
      boolean: [
        "verbose",
      ],
      stopEarly: false,
    });

    let pkgs: Package[] | null = null;
    if (myArgs._ && myArgs._.length > 0) {
      const pkgNames: string[] = myArgs._;

      pkgs = this.config.packageManager.resolvePackages(pkgNames, false, false);
      if (!pkgs) {
        this.config.packageManager.resolvePackages(["levain"], false, false);
      }

      log.info("");
      log.info(t("cmd.info.yourPackages"));
      pkgNames.forEach((pkg) => this.showPackage(myArgs, 0, pkg, new Set()));
    } else {
      this.config.packageManager.resolvePackages(["levain"], false, false);
    }

    log.info("");
    log.info("=== Levain");
    this.showPackage(myArgs, 0, "levain", new Set());

    if (pkgs) {
      log.info("");
      log.info(t("cmd.info.installationOrder"));
      pkgs.forEach((pkg) => log.info(pkg.name));
    }
  }

  showPackage(args: any, level: number, pkgName: string, visited: Set<string> = new Set()) {
    if (pkgName == "levain" && level != 0) {
      return;
    }
    if (visited.has(pkgName)) {
      return;
    }

    const ident = "  ".repeat(level);
    const pkg: Package | undefined = this.config.packageManager.package(pkgName) ??
      this.config.repositoryManager.repository.resolvePackage(pkgName);

    if (!pkg) {
      log.info("");
      log.info(t("cmd.info.packageNotFound", { pkgName: pkgName }));
      const similar = [...this.config.packageManager.getSimilarNames(pkgName)];
      if (similar.length > 0) {
        log.info(`${t("cmd.install.similar")}: ${similar.join(", ")}`);
      }
      return;
    }

    log.info(
      `${ident}+ ${pkg.name} - ${pkg.version}${pkg.installed ? "" : t("cmd.info.notInstalled")}${
        pkg.installed && pkg.updateAvailable ? t("cmd.info.needUpdate") : ""
      }`,
    );
    if (args.verbose) {
      log.info(`${ident}| baseDir...: ${pkg.baseDir}`);
      log.info(`${ident}| pkgDir....: ${pkg.pkgDir}`);
      log.info(`${ident}| repo......: ${pkg.repo?.name}`);
      log.info(`${ident}\\ filePath..: ${pkg.filePath}`);
    }

    const nextVisited = new Set(visited);
    nextVisited.add(pkgName);
    pkg.dependencies?.forEach((dep) => this.showPackage(args, level + 1, dep, nextVisited));
  }

  readonly oneLineExample = t("cmd.info.example");
}
