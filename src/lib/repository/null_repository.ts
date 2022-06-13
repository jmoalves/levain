import Config from "../config.ts";
import Package from "../package/package.ts";

import AbstractRepository from './abstract_repository.ts';

export default class NullRepository extends AbstractRepository {

    constructor(private config: Config) {
        super('nullRepo')
    }

    async init(): Promise<void> {
    }

    invalidatePackages() {
    }

    resolvePackage(packageName: string): Package | undefined {
        return undefined;
    }

    listPackages(): Array<Package> {
        return []
    }

    async readPackages(): Promise<Array<Package>> {
        return []
    }
}
