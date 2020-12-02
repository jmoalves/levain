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
        const searchText = args?.join(' ') || '';
        log.info(`list ${searchText}`);
        log.info(`Repository: ${repo.name}:`)

        const packages = repo.packages
        const filteredPackages = args
            ? packages.filter(it => it.name.includes(searchText))
            : packages

        let packageCount = filteredPackages.length;
        if (packageCount === 0) {
            log.info(`  no packages found`)
        }
        if (packageCount > 0) {
            const pluralChar = packageCount > 1 ? 's' : ''
            log.info(`  ${packageCount} package${pluralChar} found:`)
            log.info("");
            log.info("=== Packages");
            // TODO: Inform if package is already installed.
            filteredPackages.forEach(pkg => {
                log.info(`  ${this.myPad(pkg.name, 30)} ${this.myPad(pkg.version, 10)} => ${pkg.filePath}`)
            })
        }
    }

    private myPad(text: string | undefined, size: number): string {
        return (text + "" || " ").padEnd(size);
    }
}
