import * as log from "jsr:@std/log";

import t from '../lib/i18n.ts'

import Config from "../lib/config.ts";
import ActionFactory from "../action/action_factory.ts";

import Command from "./command.ts";

export default class ActionsCommand implements Command {
    constructor(
        private config: Config,
    ) {
    }

    execute(args: string[]): void {
        log.info("");
        log.info("==================================");
        const searchText = args?.join(' ') || '';
        log.info(`actions "${searchText}"`);
        log.info("");
        log.info(t("cmd.actions.actionsFound"))

        const actions = new ActionFactory().list()
            .filter(it => it.includes(searchText))
            .sort()
        actions.forEach(action => {
            log.info(`  ${action}`)
        })
    }

    readonly oneLineExample = t("cmd.actions.example")
}