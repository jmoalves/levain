import Command from "./command.ts";
import Config from "./config.ts";
import Action from "./action.ts";
import Package from './package.ts';

export default class Loader {
    constructor(private config:Config) {
    }

    async command(cmd: string, args: string[]) {
        const module = await import(`../cmd/${cmd}/${cmd}.ts`);
        const handler:Command = new module.default(this.config);
        handler.execute(args);
    }

    async action(pkg:Package, action: string, args: string[]) {
        const module = await import(`../action/${action}/${action}.ts`);
        const handler:Action = new module.default(this.config);
        handler.execute(pkg, args);
    }
}
