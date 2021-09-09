import * as log from "https://deno.land/std/log/mod.ts";

import Config from "../config.ts";
import Package from "../package/package.ts";

import Repository from './repository.ts'
import AbstractRepository from './abstract_repository.ts';
import {ArrayUtils} from "../utils/array_utils.ts";

export default class ChainRepository extends AbstractRepository {

    constructor(
        public config: Config,
        public repositories: Repository[],
    ) {
        const repos = repositories?.map(repo => repo.name).join(', ');
        super('ChanRepo', repos)
        this.repositories = ArrayUtils.removeRepetitions(
            this.repositories,
            repo => repo.absoluteURI
        )
    }

    async init(): Promise<void> {
        if (!this.repositories) {
            return
        }

        // TODO init in parallel?
        for (const repo of this.repositories) {
            await repo.init()
        }

        await super.init()
    }
    //
    // listPackages(): Array<Package> {
    //     return this.repositories
    //         .flatMap(repo => repo.listPackages())
    //         .reduce((uniquePkgs, pkg) =>
    //                 uniquePkgs.find(includedPkg => includedPkg.name === pkg.name)
    //                     ? uniquePkgs
    //                     : [...uniquePkgs, pkg],
    //             [] as Array<Package>)
    // }

    invalidatePackages() {
        for (let repo of this.repositories) {
            repo.invalidatePackages()
        }

        super.invalidatePackages()
    }

    async reloadPackages() {
        this.invalidatePackages()
        await this.init()
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

    async readPackages(): Promise<Array<Package>> {
        const packagesPromises: Array<Promise<Package[]>> = this.repositories
            .map(repo => repo.readPackages())
        const packages = await ArrayUtils.awaitAndMerge<Package>(packagesPromises)

        return ArrayUtils.removeRepetitions<Package>(
            packages,
            (pkg: Package) => pkg.name,
        )
    }

}
