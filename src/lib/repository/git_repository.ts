import * as log from "https://deno.land/std/log/mod.ts";

import Repository from './repository.ts'
import Package from '../package/package.ts'
import Config from '../config.ts';

export default class GitRepository implements Repository {
    readonly name = `gitRepo for ${this.rootUrl}`;
    packages: Array<Package> = [];

    constructor(private config: Config, private rootUrl: string) {
        log.debug(`GitRepo: Root=${this.rootUrl}`);
    }

    get absoluteURI(): string {
        return this.rootUrl;
    }

    resolvePackage(packageName: string): Package | undefined {
        return undefined;
    }

    listPackages(rootDirOnly?: boolean): Array<Package> {
        return [];
    }
}
