import Command from "../lib/command.ts";
import Logger from "../lib/logger/logger.ts";

export default class List implements Command {
    constructor(
        public logger: Logger
    ) {}

    execute(args?: string[]): void {
        this.logger.info("list - no repo found")
    }
}