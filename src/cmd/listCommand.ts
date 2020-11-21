import Command from "./command.ts";
import Logger from "../lib/logger/logger.ts";
import Config from "../lib/config.ts";
import FileLogger from "../lib/logger/fileLogger.ts";

export default class ListCommand implements Command {
    constructor(
        private config: Config,
    ) {
    }

    public logger: Logger = new FileLogger()

    execute(args?: string[]): void {
        const repo = this.config.repository
        this.logger.info(`list - listing repositories and packages`)
        this.logger.info(`repository found: ${repo.name}`)

        const packages = repo.packages
        let packageCount = packages.length;
        if (packageCount === 0) {
            this.logger.info(`no packages found`)
        }
        if (packageCount > 0) {
            this.logger.info(`${packageCount} packages found:`)
            packages.forEach(pkg => {
                this.logger.info(`package: ${pkg.name}`)
            })
        }
    }
}