import Repository from "./repository.ts";
import {MockPackage} from "../package/mock_package.ts";
import Package from "../package/package.ts";

export default class MockRepository implements Repository {
    constructor(
        public name: string = 'mockRepo',
        public packages: Array<Package> = [
            new MockPackage('aPackage', '1.0.1'),
            new MockPackage('anotherPackage', '0.1.2'),
        ],
    ) {
    }

    resolvePackage(packageName: string): Package | undefined {
        return this.packages.find(pkg => pkg.name === packageName);
    }

    readonly absoluteURI = 'mockURI';

    listPackages(rootDirOnly?: boolean): Array<Package> {
        return this.packages;
    }
}