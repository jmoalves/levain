import * as log from "@std/log";

import t from "../lib/i18n.ts";

import type Config from "../lib/config.ts";
import ActionFactory from "../action/action_factory.ts";
import { ActionDocs } from "../action/action_docs.ts";
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
    const normalizedSearch = StringUtils.removeAccentMarks(searchText).toLowerCase();
    const actions = normalizedSearch
      ? allActions.filter((it) => {
        const normalizedName = it.toLowerCase();
        const normalizedSummary = StringUtils.removeAccentMarks(ActionDocs.summary(it)).toLowerCase();
        return normalizedName.includes(normalizedSearch) || normalizedSummary.includes(normalizedSearch);
      })
      : allActions;

    const maxNameLen = actions.reduce((max, name) => Math.max(max, name.length), 0);

    actions.forEach((action) => {
      const doc = ActionDocs.get(action);
      const summary = doc ? t(doc.summaryKey) : "";
      if (summary) {
        log.info(`  ${action.padEnd(maxNameLen + 2)}${summary}`);
      } else {
        log.info(`  ${action}`);
      }
      if (normalizedSearch && doc) {
        log.info(`    ${t("cmd.actions.usageLabel")}: ${doc.usage}`);
      }
    });

    if (!normalizedSearch && actions.length > 0) {
      log.info("");
      log.info(t("cmd.actions.hint"));
    }

    if (normalizedSearch && actions.length === 0) {
      log.info(`  ${t("cmd.actions.noneFound", { search: searchText })}`);
      const similar = [...StringUtils.findSimilar(searchText, allActions, 5)];
      if (similar.length > 0) {
        log.info("");
        log.info(t("cmd.actions.didYouMean"));
        similar.forEach((name) => {
          log.info(`  ${name}`);
        });
      }
    }
  }

  readonly oneLineExample = t("cmd.actions.example");
}
