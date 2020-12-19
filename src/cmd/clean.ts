import Command from "./command.ts";
import Config from "../lib/config.ts";

export default class CleanCommand implements Command {

    constructor(
        private config: Config,
    ) {
    }

    execute(args: string[]): void {
        throw "not implemented yet"
    }

}