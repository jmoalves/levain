import Package from '../package/package.ts';

import Repository from './repository.ts';

export default abstract class AbstractRepository implements Repository {
    abstract name: string
    abstract absoluteURI: string

    abstract init(): Promise<void>

    abstract invalidatePackages(): void

    abstract readPackages(): Array<Package>

    abstract resolvePackage(packageName: string): Package | undefined

    abstract listPackages(): Array<Package>

    get length(): number {
        return this.listPackages()?.length
    }
}
