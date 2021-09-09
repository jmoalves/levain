import * as log from "https://deno.land/std/log/mod.ts";

import Config from "../config.ts";
import Package from "../package/package.ts";

import Repository from './repository.ts'
import AbstractRepository from './abstract_repository.ts';

export default class ChainRepository extends AbstractRepository {

    constructor(
        public config: Config,
        public repositories: Repository[],
    ) {
        super();
        this.name = `chainRepo for ${this.repositories?.map(repo => repo.name).join(', ')}`;
    }

    readonly name: string;

    async init(): Promise<void> {
        if (!this.repositories) {
            return
        }

        for (let repo of this.repositories) {
            await repo.init()
        }
    }

    listPackages(): Array<Package> {
        return this.repositories
            .flatMap(repo => repo.listPackages())
            .reduce((uniquePkgs, pkg) =>
                    uniquePkgs.find(includedPkg => includedPkg.name === pkg.name)
                        ? uniquePkgs
                        : [...uniquePkgs, pkg],
                [] as Array<Package>)
    }

    invalidatePackages() {
        for (let repo of this.repositories) {
            repo.invalidatePackages()
        }
    }

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

    readPackages(): Array<Package> {
        return this.listPackages()
    }
}
