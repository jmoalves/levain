import Repository from './repository.ts'
import FileSystemPackage from '../package/file_system_package.ts'
import Config from "../config.ts";
import Package from "../package/package.ts";

export default class NullRepository implements Repository {
    name = 'nullRepo';
    packages: Array<Package> = [];

    constructor(private config: Config) {
    }

    get absoluteURI(): string {
        return this.name;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    resolvePackage(packageName: string): Package | undefined {
        return undefined;
    }

    listPackages(rootDirOnly?: boolean): Array<Package> {
        return [];
    }
}
