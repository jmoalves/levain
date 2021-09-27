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

    async readPackages(): Promise<Array<Package>> {
        return this.packages
    }
}
