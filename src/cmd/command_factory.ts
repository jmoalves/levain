import Install from "./install.ts";
import Shell from "./shell.ts";
import ListCommand from "./list_command.ts";
import Command from "./command.ts";
import Config from "../lib/config.ts";

export default class CommandFactory {

    get(cmd: string, config: Config): Command {
        switch (cmd) {
            case 'install':
                return new Install(config);

            case 'shell':
                return new Shell(config);

            case 'list':
                return new ListCommand(config);

            default:
                throw new Error(`Command ${cmd} not found - Aborting...`);
        }
    }

    // private async loadCommandDynamic(cmd: string): Promise<Command> {
    //     const module = await import(`../cmd/${cmd}.ts`);
    //     return new module.default(config);
    // }
}