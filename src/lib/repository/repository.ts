import Package from "../package/package.ts";

export default interface Repository {
    name: string;

    listPackages(): Array<Package>;

    length: number;

    readonly absoluteURI: string;

    init(): Promise<void>;

    invalidatePackages(): void;

    resolvePackage(packageName: string): Package | undefined;

    readPackages(): Array<Package>;
}
