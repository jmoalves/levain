import * as log from "https://deno.land/std/log/mod.ts";

import Repository from './repository.ts'
import Config from "../config.ts";
import Package from "../package/package.ts";
import AbstractRepository from './abstract_repository.ts';

export default class ChainRepository extends AbstractRepository {
    constructor(
        public config: Config,
        public repositories: Repository[],
    ) {
        super();
        this.name = `chainRepo for ${this.repositories?.map(repo => repo.name).join(', ')}`;
        this.packages = this.listPackages();
    }

    readonly name;
    packages: Array<Package>;

    get absoluteURI(): string {
        return this.name;
    }

    resolvePackage(packageName: string): Package | undefined {
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

    listPackages(rootDirOnly: boolean = false): Array<Package> {
        return this.repositories
            .flatMap(repo => repo.listPackages(rootDirOnly))
            .reduce((uniquePkgs, pkg) =>
                    uniquePkgs.find(includedPkg => includedPkg.name === pkg.name)
                        ? uniquePkgs
                        : [...uniquePkgs, pkg],
                [] as Array<Package>)
    }
}
