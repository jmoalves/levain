import * as log from "https://deno.land/std/log/mod.ts";

import CommandFactory from "../cmd/command_factory.ts";
import Command from "../cmd/command.ts";
import ActionFactory from "../action/action_factory.ts";
import Action from "../action/action.ts";

import Package from './package/package.ts';

import Config from "./config.ts";
import {handleQuotes} from "./parse_args.ts";

export default class Loader {
    constructor(private config: Config) {
    }

    private commandFactory = new CommandFactory();

    async command(cmd: string, args: string[]) {
        log.debug('')
        log.debug(`+ COMMAND: ${cmd} ${args}`)

        log.info("");
        log.info("==================================");
        log.info(`${cmd} ${JSON.stringify(args)}`);

        const handler: Command = this.commandFactory.get(cmd, this.config)
        await handler.execute(args);
    }

    private actionFactory = new ActionFactory();

    async action(pkg: Package, cmdline: string) {
        log.debug('')
        log.debug(`+ ACTION: ${JSON.stringify(cmdline)}`)

        let args = cmdline.split(" ");
        let action = args.shift();

        if (action == undefined) {
            throw 'No action to perform';
        }

        log.debug(`- ARG-ORIG ${args}`);
        args = handleQuotes(args);
        log.debug(`- ARG-QUOT ${args}`);
        const handler: Action = this.actionFactory.get(action, this.config);

        for (let index in args) {
            args[index] = this.config.replaceVars(args[index], pkg.name);
        }

        await handler.execute(pkg, args);
    }


}
