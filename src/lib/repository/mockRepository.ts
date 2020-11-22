import Repository from "./repository.ts";
import FileSystemPackage from "../package/fileSystemPackage.ts";
import {MockPackage} from "../package/mockPackage.ts";
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

    resolvePackage(packageName: string): FileSystemPackage | undefined {
        return undefined;
    }
}