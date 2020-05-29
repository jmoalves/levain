import Command from "./command.ts";
import Config from "./config.ts";

export default class Loader {
    constructor(private config:Config) {
    }

    async execute(cmd: string, args: string[]) {
        const module = await import(`../cmd/${cmd}/${cmd}.ts`);
        const handler:Command = new module.default(this.config);
        handler.execute(args);
    }
}
