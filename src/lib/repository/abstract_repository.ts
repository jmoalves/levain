import Repository from './repository.ts';
import Package from '../package/package.ts';
import Config from "../config.ts";

export default abstract class AbstractRepository implements Repository {
    abstract name: string;
    abstract packages: Array<Package>;

    abstract absoluteURI: string;

    abstract init(): void

    abstract invalidatePackages(): void

    abstract listPackages(): Array<Package>

    abstract resolvePackage(packageName: string): Package | undefined

    get length(): number {
        return this.packages.length
    }
}
