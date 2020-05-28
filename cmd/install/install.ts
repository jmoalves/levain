import Command from "../../lib/command.ts";

export default class Install implements Command {
    constructor() {
    }

    execute(args: string[]): void {
        console.log("install " + JSON.stringify(args));
    }
}
