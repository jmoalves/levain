import * as log from "https://deno.land/std/log/mod.ts";

import Command from "./command.ts";
import Config from "../lib/config.ts";

export default class ListCommand implements Command {
    constructor(private config: Config) {
    }

    execute(args?: string[]): void {
        const repo = this.config.repository
        log.info("");
        log.info("==================================");
        log.info(`list ${JSON.stringify(args)}`);
        log.info(`Repository: ${repo.name}:`)

        const packages = repo.packages
        let packageCount = packages.length;
        if (packageCount === 0) {
            log.info(`  no packages found`)
        }
        if (packageCount > 0) {
            log.info(`  ${packageCount} packages found:`)
            log.info("");
            log.info("=== Packages");
            // TODO: Inform if package is already installed.
            packages.forEach(pkg => {
                log.info(`  ${this.myPad(pkg.name, 30)} ${this.myPad(pkg.version, 10)} => ${pkg.filePath}`)
            })
        }
    }

    private myPad(text: string | undefined, size: number): string {
        return (text + "" || " ").padEnd(size);
    }
}
