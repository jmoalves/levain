import * as log from "jsr:@std/log";
import Package from '../package/package.ts';

import Repository from './repository.ts';

export default abstract class AbstractRepository implements Repository {
    private _initialized = false;

    constructor(
        readonly name: string,
        readonly absoluteURI?: string,
    ) {
        log.debug(`${this.describe()} constructor`)
    }

    abstract init(): Promise<void>
    abstract listPackages(): Array<Package>
    abstract resolvePackage(packageName: string): Package | undefined
    abstract reload(): Promise<void>
    
    describe(): string {
        return `${this.name} (${this.absoluteURI})`
    }

    size(): number {
        return this.listPackages()?.length
    }

    initialized(): boolean {
        return this._initialized
    }

    protected setInitialized(): void {
        this._initialized = true
    }
}
