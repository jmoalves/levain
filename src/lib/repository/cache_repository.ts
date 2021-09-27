import Config from "../config.ts";
import Package from "../package/package.ts";

import Repository from './repository.ts'
import AbstractRepository from './abstract_repository.ts';

export default class CacheRepository extends AbstractRepository {

    private cache: Map<string, Package> = new Map();

    constructor(
        public config: Config,
        public repository: Repository,
    ) {
        super('CacheRepo', repository?.describe())
    }

    async init(): Promise<void> {
        if (!this.repository) {
            return;
        }

        await this.repository.init()

        await super.init()
    }

    invalidatePackages() {
        this.repository.invalidatePackages()
    }

    resolvePackage(packageName: string): Package | undefined {
        if (this.cache.has(packageName)) {
            return this.cache.get(packageName);
        }

        if (!this.repository) {
            return undefined
        }

        const pkg = this.repository.resolvePackage(packageName)
        if (pkg) {
            this.cache.set(packageName, pkg);
        }

        return pkg;
    }

    async readPackages(): Promise<Array<Package>> {
        return await this.repository.readPackages()
    }
}
