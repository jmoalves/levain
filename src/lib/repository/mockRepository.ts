import Repository from "./repository.ts";
import Package from "../package/package.ts";

export class MockRepository implements Repository {
    constructor(
        public name: string = 'mockRepo',
        public packages: string[] = ['aPackage', 'anotherPackage'],
    ) {}

    resolvePackage(packageName: string): Package | undefined {
        return undefined;
    }
}