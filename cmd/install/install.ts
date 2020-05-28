import Command from "../../lib/command.ts";
import Config from "../../lib/config.ts";

export default class Install implements Command {
    constructor(private config:Config) {
    }

    execute(args: string[]): void {
        console.log("install " + JSON.stringify(args) + " config=" + JSON.stringify(this.config.repository));
    }
}
