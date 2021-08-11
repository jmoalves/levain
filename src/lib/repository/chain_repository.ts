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
    private _packages: Array<Package> = [];

    async init(): Promise<void> {
        if (!this.repositories) {
            return
        }

        for (let repo of this.repositories) {
            await repo.init()
        }
        this.loadPackages();
    }

    private loadPackages() {
        this._packages = this.readPackages()
    }

    listPackages(): Array<Package> {
        if (!this._packages) {
            this.loadPackages()
        }
        return this._packages
    }

    invalidatePackages() {
        for (let repo of this.repositories) {
            repo.invalidatePackages()
        }

        this._packages = this.readPackages()
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
        return this.repositories
            .flatMap(repo => repo.readPackages())
            .reduce((uniquePkgs, pkg) =>
                    uniquePkgs.find(includedPkg => includedPkg.name === pkg.name)
                        ? uniquePkgs
                        : [...uniquePkgs, pkg],
                [] as Array<Package>)
    }
}
