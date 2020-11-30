import Package from "../package/package.ts";

export default interface Repository {
    packages: Array<Package>;
    name: string;

    readonly absoluteURI: string;

    resolvePackage(packageName: string): Package | undefined;
    listPackages(rootDirOnly?: boolean): Array<Package>;
}
