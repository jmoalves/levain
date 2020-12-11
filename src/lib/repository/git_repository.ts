import * as log from "https://deno.land/std/log/mod.ts";
import Package from '../package/package.ts'
import Config from '../config.ts';
import AbstractRepository from './abstract_repository.ts';

export default class GitRepository extends AbstractRepository {
    readonly name = `gitRepo for ${this.rootUrl}`;
    packages: Array<Package> = [];

    constructor(private config: Config, private rootUrl: string) {
        super();
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
