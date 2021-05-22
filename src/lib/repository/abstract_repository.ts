import Package from '../package/package.ts';

import Repository from './repository.ts';

export default abstract class AbstractRepository implements Repository {
    abstract name: string
    abstract packages: Array<Package>
    abstract absoluteURI: string

    abstract init(): Promise<void>

    abstract invalidatePackages(): void

    abstract readPackages(): Array<Package>

    abstract resolvePackage(packageName: string): Package | undefined

    get length(): number {
        return this.packages?.length
    }
}
