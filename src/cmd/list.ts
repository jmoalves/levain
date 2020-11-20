import Command from "./command.ts";
import Logger from "../lib/logger/logger.ts";
import Config from "../lib/config.ts";
import FileLogger from "../lib/logger/fileLogger.ts";

export default class List implements Command {
    constructor(
        private config: Config,
    ) {}

    public logger: Logger = new FileLogger()

    execute(args?: string[]): void {
        this.logger.info("list - no repo found")
    }
}