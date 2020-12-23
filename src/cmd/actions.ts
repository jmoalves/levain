import Command from "./command.ts";
import Config from "../lib/config.ts";
import * as log from "https://deno.land/std/log/mod.ts";
import ActionFactory from "../action/action_factory.ts";

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
        log.info(`= Actions:`)

        const actions = new ActionFactory().list()
            .filter(it => it.includes(searchText))
            .sort()
        actions.forEach(action => {
            log.info(`  ${action}`)
        })
    }

    readonly oneLineExample = "  actions <optional search text>"
}