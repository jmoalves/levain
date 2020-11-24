import * as log from "https://deno.land/std/log/mod.ts";

import Repository from './repository.ts'
import FileSystemPackage from '../package/file_system_package.ts'
import Config from "../config.ts";
import Package from "../package/package.ts";

export default class ChainRepository implements Repository {
    constructor(
        private config: Config,
        private repositories: Repository[],
    ) {
        this.packages = this.listPackages();
    }

    readonly name = `chainRepo for ${this.repositories.map(repo => repo.name).join(', ')}`;
    packages: Array<Package>;

    resolvePackage(packageName: string): FileSystemPackage | undefined {
        if (!this.repositories) {
            return undefined;
        }

        for (const repo of this.repositories) {
            const pkg = repo.resolvePackage(packageName)
            if (pkg) {
                return pkg;
            }
        }

        return undefined;
    }

    private listPackages(): Array<Package> {
        log.debug('listPackages', this.repositories)
        return this.repositories
            .flatMap(repo => repo.packages)
            .reduce((uniquePkgs, pkg) =>
                    uniquePkgs.find(includedPkg => includedPkg.name === pkg.name)
                        ? uniquePkgs
                        : [...uniquePkgs, pkg],
                [] as Array<Package>)
    }
}
