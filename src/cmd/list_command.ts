import * as log from "@std/log";

import t from "../lib/i18n.ts";

import type Config from "../lib/config.ts";
import StringUtils from "../lib/utils/string_utils.ts";

import type Command from "./command.ts";

export default class ListCommand implements Command {
  constructor(private config: Config) {
  }

  execute(args?: string[]): void {
    const repo = this.config.repositoryManager.repository;
    log.info("");
    log.info("==================================");
    const searchText = args?.join(" ") || "";
    log.info(`list "${searchText}"`);
    log.info(t("cmd.list_command.repo"));
    log.info(`  ${repo.describe()}`);

    const packages = repo.listPackages();
    const lowerSearch = searchText.toLowerCase();
    const filteredPackages = lowerSearch
      ? packages?.filter((it) => it.name.toLowerCase().includes(lowerSearch))
      : packages;

    const packageCount = packages?.length;
    if (!packageCount) {
      log.info(`  ${t("cmd.list_command.noPackages")}`);
    } else {
      const filteredPackageCount = filteredPackages.length;
      if (filteredPackageCount > 0) {
        log.info(`  ${t("cmd.list_command.packagesFound", { pkg: filteredPackageCount, count: packageCount })}`);
        log.info("");
        log.info(`== ${t("cmd.list_command.packages", { count: filteredPackageCount })}`);
        // TODO: Inform if package is already installed.
        filteredPackages.forEach((pkg) => {
          log.info(`   ${StringUtils.padEnd(pkg?.name, 30)}`);
        });
      } else {
        log.info(``);
        log.info(`${searchText} - ${t("cmd.list_command.unableToList")}`);

        const similarPackages = [...StringUtils.findSimilar(searchText, packages.map((it) => it.name))];
        log.info(``);
        if (similarPackages.length == 0) {
          log.info(`${searchText} - ${t("cmd.list_command.unableToSimilar")}`);
        } else {
          log.info(`${searchText} - ${t("cmd.list_command.similarPackages")}`);
          for (const name of similarPackages) {
            log.info(name);
          }
        }
        log.info("");
      }
    }
  }

  readonly oneLineExample = t("cmd.list_command.example");
}
