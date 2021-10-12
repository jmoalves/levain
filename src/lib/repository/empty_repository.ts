import Repository from "./repository.ts";
import Package from "../package/package.ts";

export class EmptyRepository implements Repository {
    name = 'EmptyRepo'

    describe(): string {
        return this.name;
    }

    init(): Promise<void> {
        return Promise.resolve(undefined);
    }

    initialized(): boolean {
        return true;
    }

    invalidatePackages(): void {
    }

    listPackages(): Array<Package> {
        return [];
    }

    readPackages(): Promise<Array<Package>> {
        return Promise.resolve([]);
    }

    resolvePackage(packageName: string): Package | undefined {
        return undefined;
    }

    size(): number {
        return 0;
    }
}
