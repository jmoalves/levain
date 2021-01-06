import * as log from "https://deno.land/std/log/mod.ts";

import Command from "./command.ts";
import Config from "../lib/config.ts";

export default class ListCommand implements Command {
    constructor(private config: Config) {
    }

    execute(args?: string[]): void {
        const repo = this.config.repositoryManager.repository
        log.info("");
        log.info("==================================");
        const searchText = args?.join(' ') || '';
        log.info(`list "${searchText}"`);
        log.info(`= Repository:`)
        log.info(`  ${repo.name}`)

        const packages = repo.packages
        const filteredPackages = args
            ? packages?.filter(it => it.name.includes(searchText))
            : packages

        const packageCount = packages?.length;
        if (!packageCount) {
            log.info(`  no packages found`)
        } else {
            const filteredPackageCount = filteredPackages.length;
            const repoPackageCountText =
                filteredPackageCount !== packageCount
                    ? `of ${packageCount} `
                    : ''
            if (filteredPackageCount > 0) {
                const repoPluralChar = packageCount > 1 ? 's' : ''
                log.info(`  ${filteredPackageCount} ${repoPackageCountText}package${repoPluralChar} found`)
                log.info("");
                const filteredPluralChar = filteredPackageCount > 1 ? 's' : ''
                log.info(`== Package${filteredPluralChar}`);
                // TODO: Inform if package is already installed.
                filteredPackages.forEach(pkg => {
                    log.info(`   ${this.myPad(pkg.name, 30)} ${this.myPad(pkg.version, 10)} => ${pkg.filePath}`)
                })
            }
        }
    }

    private myPad(text: string | undefined, size: number): string {
        return (text + "" || " ").padEnd(size);
    }

    readonly oneLineExample = "  list <optional search text>"
}
