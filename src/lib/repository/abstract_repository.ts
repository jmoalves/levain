import * as log from "https://deno.land/std/log/mod.ts";
import Package from '../package/package.ts';

import Repository from './repository.ts';

export default abstract class AbstractRepository implements Repository {
    protected _packages?: Array<Package>

    constructor(
        readonly name: string,
        readonly absoluteURI?: string,
    ) {
        log.debug(`${this.describe()} constructor`)
    }

    describe(): string {
        return `${this.name} (${this.absoluteURI})`
    }

    async init(): Promise<void> {
        log.debug(`${this.describe()} init`)

        this._packages = (await this.readPackages())
            .sort((a, b) => a?.name?.localeCompare(b?.name))

        const count = this._packages.length

        log.debug(`Found ${count} packages in ${this.describe()}: ${this._packages}`)
        log.debug(``)
    }

    abstract readPackages(): Promise<Array<Package>>

    async reloadPackages() {
        this.invalidatePackages()
        await this.init()
    }

    invalidatePackages(): void {
        log.debug(`invalidatePackages - ${this.name}`)

        this._packages = undefined
    }

    listPackages(): Array<Package> {
        log.debug(`listPackages - ${this.name}`)

        if (!this._packages) {
            throw new Error(`Please init repository ${this.describe()} before listing packages`)
        }
        return this._packages
    }

    size(): number {
        return this.listPackages()?.length
    }

    resolvePackage(packageName: string): Package | undefined {
        log.debug(`resolvePackage - looking for ${packageName} in ${this.describe()}`)

        const packages = this.listPackages()

        const pkg = packages.find(pkg => pkg.name === packageName)

        if (pkg) {
            log.debug(`${this.name}: found package ${packageName} => ${pkg.toString()}`);
        } else {
            log.debug(`${this.name}: package ${packageName} not found in ${this.describe()}`);
            log.debug(`Known packages: ${packages}`)
        }

        return pkg;
    }

}
