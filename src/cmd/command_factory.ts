import Install from "./install.ts";
import Shell from "./shell.ts";
import Command from "./command.ts";
import Config from "../lib/config.ts";
import ListCommand from "./list_command.ts";
import CleanCommand from "./clean.ts";
import ActionsCommand from "./actions.ts";
import InfoCommand from "./info.ts";

const commandMap = new Map<string, (config: Config) => Command>([
    ['install', (config: Config) => new Install(config)],
    ['shell', (config: Config) => new Shell(config)],
    ['list', (config: Config) => new ListCommand(config)],
    ['clean', (config: Config) => new CleanCommand(config)],
    ['actions', (config: Config) => new ActionsCommand(config)],
    ['info', (config: Config) => new InfoCommand(config)],
])
export default class CommandFactory {

    list() {
        return [...commandMap.keys()];
    }

    get(cmd: string, config: Config): Command {
        const builder = commandMap.get(cmd)
        if (!builder) {
            throw new CommandNotFoundError(cmd);
        }
        return builder(config)
    }

    // private async loadCommandDynamic(cmd: string): Promise<Command> {
    //     const module = await import(`../cmd/${cmd}.ts`);
    //     return new module.default(config);
    // }

}

export class CommandNotFoundError extends Error {
    constructor(cmd: string) {
        super(`Command ${cmd} not found - Aborting...`)
    }
 }
