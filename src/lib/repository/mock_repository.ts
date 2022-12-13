import {MockPackage} from "../package/mock_package.ts";
import Package from "../package/package.ts";

import AbstractRepository from './abstract_repository.ts';
import VersionNumber from "../utils/version_number.ts";

export default class MockRepository extends AbstractRepository {
    constructor(
        name = 'MockRepo',
        private packages: Array<Package> = [
            new MockPackage('aPackage', new VersionNumber('1.0.1')),
            new MockPackage('anotherPackage', new VersionNumber('0.1.2')),
        ],
    ) {
        super(name, `mockURI-${name}`)
    }

    init(): Promise<void> {
        this.setInitialized()
        return Promise.resolve()
    }

    listPackages(): Array<Package> {
        return this.packages
    }

    resolvePackage(packageName: string): Package | undefined {
        const pkg = this.packages.filter(pkg => pkg.name == packageName)
        return ( pkg ? pkg[0] : undefined )
    }

    reload(): Promise<void> {
        return Promise.resolve()
    }
}
