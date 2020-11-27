import * as log from "https://deno.land/std/log/mod.ts";

import Command from "../cmd/command.ts";
import Config from "./config.ts";
import Action from "../action/action.ts";
import FileSystemPackage from './package/file_system_package.ts';

// Commands
import Install from "../cmd/install.ts";
import Shell from "../cmd/shell.ts";

// Actions
import AddPath from "../action/addpath.ts";
import Copy from "../action/copy.ts";
import DefaultPackage from "../action/defaultPackage.ts";
import Extract from "../action/extract.ts";
import Inspect from "../action/inspect.ts";
import LevainShell from "../action/levainShell.ts";
import Mkdir from "../action/mkdir.ts";
import SaveConfig from "../action/saveConfig.ts";
import SetEnv from "../action/setEnv.ts";
import Template from "../action/template.ts";
import ListCommand from "../cmd/list_command.ts";
import AssertContainsAction from "../action/assert_contains_action.ts";

export default class Loader {
    constructor(private config: Config) {
    }

    async command(cmd: string, args: string[]) {
        log.info('')
        log.info(`+ COMMAND: ${cmd} ${args}`)

        const handler: Command = this.loadCommandStatic(cmd);
        await handler.execute(args);
    }

    async action(pkg: FileSystemPackage, cmdline: string) {
        log.info('')
        log.info(`+ ACTION: ${cmdline}`)

        let args = cmdline.split(" ");
        let action = args.shift();

        if (action == undefined) {
            throw 'No action to perform';
        }

        const handler: Action = this.loadActionStatic(action);

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

    loadActionStatic(action: string): Action {
        switch (action) {
            case 'addPath':
                return new AddPath(this.config);

            case 'copy':
                return new Copy(this.config);

            case 'defaultPackage':
                return new DefaultPackage(this.config);

            case 'extract':
                return new Extract(this.config);

            case 'inspect':
                return new Inspect(this.config);

            case 'levainShell':
                return new LevainShell(this.config);

            case 'mkdir':
                return new Mkdir(this.config);

            case 'saveConfig':
                return new SaveConfig(this.config);

            case 'setEnv':
                return new SetEnv(this.config);

            case 'template':
                return new Template(this.config);

            case 'assertContains':
                return new AssertContainsAction(this.config);

            default:
                throw new Error(`Action ${action} not found - Aborting...`);
        }
    }

    private async loadActionDynamic(action: string): Promise<Action> {
        const module = await import(`../action/${action}.ts`);
        return new module.default(this.config);
    }
}
