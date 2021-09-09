import Package from "../package/package.ts";

export default interface Repository {
    name: string
    readonly absoluteURI?: string

    describe(): string

    listPackages(): Array<Package>

    size(): number

    init(): Promise<void>

    invalidatePackages(): void

    resolvePackage(packageName: string): Package | undefined

    readPackages(): Promise<Array<Package>>
}
