import {MockPackage} from "../package/mock_package.ts";
import Package from "../package/package.ts";

import AbstractRepository from './abstract_repository.ts';
import VersionNumber from "../utils/version_number.ts";

export default class MockRepository extends AbstractRepository {
    constructor(
        public name: string = 'mockRepo',
        public packages: Array<Package> = [
            new MockPackage('aPackage', new VersionNumber('1.0.1')),
            new MockPackage('anotherPackage', new VersionNumber('0.1.2')),
        ],
    ) {
        super();
    }

    async init(): Promise<void> {
    }

    invalidatePackages() {
    }

    resolvePackage(packageName: string): Package | undefined {
        return this.packages.find(pkg => pkg.name === packageName);
    }

    readonly absoluteURI = 'mockURI';

    listPackages(): Array<Package> {
        return this.readPackages()
    }

    readPackages(): Array<Package> {
        return this.packages;
    }
}
