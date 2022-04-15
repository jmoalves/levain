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
        super('ChainRepo', ChainRepository.describeRepositories(repositories))
        this.repositories = ArrayUtils.removeRepetitions(
            this.repositories,
            repo => repo.absoluteURI
        )
    }

    private static describeRepositories(repositories: Repository[]): string {
        return repositories?.map(repo => repo.describe()).join(', ');
    }

    async init(): Promise<void> {
        if (!this.repositories) {
            return
        }

        // TODO init in parallel?
        for (const repo of this.repositories) {
            if (!repo.initialized()) {
                await repo.init()
            }
        }

        this.setInitialized()
    }

    listPackages(): Array<Package> {
        const packages = this.repositories
            .map(repo => repo.listPackages())
            .reduce((acc, val) => acc.concat(val), [])

        return ArrayUtils.removeRepetitions<Package>(
            packages,
            (pkg: Package) => pkg.name,
        )
    }

    resolvePackage(packageName: string): Package | undefined {
        for (let repo of this.repositories) {
            let pkg = repo.resolvePackage(packageName)
            if (pkg) {
                return pkg
            }
        }

        return undefined
    }

    async reload(): Promise<void> {
        for (const repo of this.repositories) {
            await repo.reload()
        }
    }
}
