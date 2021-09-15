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
        return repositories?.map(repo => repo.name).join(', ')
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

    invalidatePackages() {
        for (let repo of this.repositories) {
            repo.invalidatePackages()
        }

        super.invalidatePackages()
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
