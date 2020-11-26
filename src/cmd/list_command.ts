import Command from "./command.ts";
import Logger from "../lib/logger/logger.ts";
import Config from "../lib/config.ts";
import ConsoleAndFileLogger from "../lib/logger/console_and_file_logger.ts";

export default class ListCommand implements Command {
    constructor(private config: Config) {
    }

    public logger: Logger = new ConsoleAndFileLogger()

    execute(args?: string[]): void {
        const repo = this.config.repository
        this.logger.info("");
        this.logger.info("==================================");
        this.logger.info(`list ${JSON.stringify(args)}`);
        this.logger.info(`Repository: ${repo.name}:`)

        const packages = repo.packages
        let packageCount = packages.length;
        if (packageCount === 0) {
            this.logger.info(`  no packages found`)
        }
        if (packageCount > 0) {
            this.logger.info(`  ${packageCount} packages found:`)
            this.logger.info("");
            this.logger.info("=== Packages");
            // TODO: Inform if package is already installed.
            packages.forEach(pkg => {
                this.logger.info(`  ${this.myPad(pkg.name, 30)} ${this.myPad(pkg.version, 10)} => ${pkg.filePath}`)
            })
        }
    }

    private myPad(text: string|undefined, size: number): string {
        return (text + "" || " ").padEnd(size);
    }
}
