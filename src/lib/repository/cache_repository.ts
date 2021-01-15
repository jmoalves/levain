import * as log from "https://deno.land/std/log/mod.ts";

import Repository from './repository.ts'
import Config from "../config.ts";
import Package from "../package/package.ts";
import AbstractRepository from './abstract_repository.ts';

export default class CacheRepository extends AbstractRepository {
    readonly name;
    packages: Array<Package> = [];

    private cache: Map<string, Package> = new Map();

    // eslint-disable-next-line no-useless-constructor
    constructor(
        public config: Config,
        public repository: Repository,
    ) {
        super();
        this.name = `cacheRepo for ${this.repository?.name}`;
    }

    async init(): Promise<void> {
        if (!this.repository) {
            return;
        }

        await this.repository.init()
        this.packages = this.repository.packages;
    }

    invalidatePackages() {
        this.repository.invalidatePackages();
        this.packages = this.repository.packages;
    }

    get absoluteURI(): string {
        return this.name;
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

    listPackages(): Array<Package> {
        return this.packages;
    }
}
