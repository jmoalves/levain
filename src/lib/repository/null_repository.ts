import Repository from './repository.ts'
import FileSystemPackage from '../package/fileSystemPackage.ts'
import Config from "../config.ts";
import Package from "../package/package.ts";

export default class NullRepository implements Repository {
    constructor(private config: Config) {
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    resolvePackage(packageName: string): FileSystemPackage | undefined {
        return undefined;
    }

    name = 'nullRepo';
    packages: Array<Package> = [];
}
