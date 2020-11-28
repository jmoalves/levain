import Repository from './repository.ts'
import FileSystemPackage from '../package/file_system_package.ts'
import Config from "../config.ts";
import Package from "../package/package.ts";

export default class CacheRepository implements Repository {
    readonly name = `cacheRepo for ${this.repository?.name}`;
    packages: Array<Package> = this.repository.packages;

    private cache: Map<string, Package> = new Map();

    // eslint-disable-next-line no-useless-constructor
    constructor(
        private config: Config,
        private repository: Repository
    ) {
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

    listPackages(rootDirOnly?: boolean): Array<Package> {
        return this.repository.listPackages(rootDirOnly);
    }
}
