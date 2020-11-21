import Repository from './repository.ts'
import FileSystemPackage from '../package/fileSystemPackage.ts'
import Config from "../config.ts";
import {Package} from "../package/package.ts";

export default class ChainRepository implements Repository {
    constructor(private config: Config, private repositories: Repository[]) {
    }

    readonly name = `ChainRepo`;
    packages: Array<Package> = [];

    resolvePackage(packageName: string): FileSystemPackage | undefined {
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

}
