import Package from "../package/package.ts";

export default interface Repository {
    name: string
    readonly absoluteURI?: string

    init(): Promise<void>
    initialized(): boolean
    describe(): string
    listPackages(): Array<Package>
    size(): number
    resolvePackage(packageName: string): Package | undefined
    reload(): Promise<void>
}
