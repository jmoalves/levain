import Config from "../config.ts";
import Package from "../package/package.ts";

export default interface Repository {
    packages: Array<Package>;
    name: string;
    length: number;

    readonly absoluteURI: string;

    init(): void;

    resolvePackage(packageName: string): Package | undefined;

    listPackages(rootDirOnly?: boolean): Array<Package>;
}
