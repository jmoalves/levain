import Repository from "./repository.ts";
import FileSystemPackage from "../package/fileSystemPackage.ts";
import {MockPackage} from "../package/mockPackage.ts";
import {Package} from "../package/package.ts";

export default class MockRepository implements Repository {
    constructor(
        public name: string = 'mockRepo',
        public packages: Array<Package> = [
            new MockPackage('aPackage'),
            new MockPackage('anotherPackage'),
        ],
    ) {
    }

    resolvePackage(packageName: string): FileSystemPackage | undefined {
        return undefined;
    }
}