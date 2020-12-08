import * as log from "https://deno.land/std/log/mod.ts";

import Command from "../cmd/command.ts";
import Config from "./config.ts";
import Action from "../action/action.ts";
import Package from './package/package.ts';

import {handleQuotes} from "./parse_args.ts";

// Commands
import Install from "../cmd/install.ts";
import Shell from "../cmd/shell.ts";
import ListCommand from "../cmd/list_command.ts";

import ActionFactory from "../action/action_factory.ts";

export default class Loader {
    constructor(private config: Config) {
    }

    async command(cmd: string, args: string[]) {
        log.debug('')
        log.debug(`+ COMMAND: ${cmd} ${args}`)

        log.info("");
        log.info("==================================");
        log.info(`${cmd} ${JSON.stringify(args)}`);

        const handler: Command = this.loadCommandStatic(cmd);
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

    loadCommandStatic(cmd: string): Command {
        switch (cmd) {
            case 'install':
                return new Install(this.config);

            case 'shell':
                return new Shell(this.config);

            case 'list':
                return new ListCommand(this.config);

            default:
                throw new Error(`Command ${cmd} not found - Aborting...`);
        }
    }

    private async loadCommandDynamic(cmd: string): Promise<Command> {
        const module = await import(`../cmd/${cmd}.ts`);
        return new module.default(this.config);
    }

}
