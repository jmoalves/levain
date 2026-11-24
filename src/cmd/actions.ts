import * as log from "@std/log";

import t from "../lib/i18n.ts";

import type Config from "../lib/config.ts";
import ActionFactory from "../action/action_factory.ts";
import StringUtils from "../lib/utils/string_utils.ts";

import type Command from "./command.ts";

export default class ActionsCommand implements Command {
  constructor(
    private config: Config,
  ) {
  }

  execute(args: string[]): void {
    log.info("");
    log.info("==================================");
    const searchText = args?.join(" ") || "";
    log.info(`actions "${searchText}"`);
    log.info("");
    log.info(t("cmd.actions.actionsFound"));

    const allActions = new ActionFactory().list().sort();
    const lowerSearch = searchText.toLowerCase();
    const actions = lowerSearch
      ? allActions.filter((it) => it.toLowerCase().includes(lowerSearch))
      : allActions;

    actions.forEach((action) => {
      log.info(`  ${action}`);
    });

    if (lowerSearch && actions.length === 0) {
      const similar = [...StringUtils.findSimilar(searchText, allActions)];
      if (similar.length > 0) {
        log.info("");
        log.info(t("cmd.command_factory.didYouMean"));
        similar.forEach((name) => {
          log.info(`  ${name}`);
        });
      }
    }
  }

  readonly oneLineExample = t("cmd.actions.example");
}
