import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import Package from '../package/package.ts'
import Config from '../config.ts';
import AbstractRepository from './abstract_repository.ts';
import GitUtils from "../git_utils.ts";
import { existsSync } from "https://deno.land/std/fs/exists.ts";
import FileSystemRepository from "./file_system_repository.ts";

export default class GitRepository extends AbstractRepository {
    readonly name;
    private readonly gitUtils: GitUtils;

    private readonly localDir: string;
    private localRepo: FileSystemRepository|undefined;

    constructor(private config: Config, private rootUrl: string, private rootOnly: boolean = false) {
        super();

        log.info(`GitRepo: Root=${this.rootUrl}`);
        this.name = `gitRepo for ${this.rootUrl}`;
        this.gitUtils = new GitUtils(config);
        this.localDir = path.resolve(this.config.levainConfigDir, "gitRepos", path.basename(this.rootUrl, ".git"));
    }

    async init(): Promise<void> {
        if (existsSync(this.localDir)) {
            await this.gitUtils.pull(this.localDir);
        } else {
            await this.gitUtils.clone(this.rootUrl, this.localDir);
        }

        this.localRepo = new FileSystemRepository(this.config, this.localDir, this.rootOnly);
        await this.localRepo.init();
    }

    invalidatePackages() {
        this.localRepo?.invalidatePackages();
    }

    get absoluteURI(): string {
        return this.rootUrl;
    }

    get packages(): Array<Package> {
        if (!this.localRepo) {
            throw Error(`${this.name} not loaded`)
        }

        return this.localRepo.packages;
    }

    resolvePackage(packageName: string): Package | undefined {
        if (!this.localRepo) {
            throw Error(`${this.name} not loaded`)
        }

        return this.localRepo.resolvePackage(packageName);
    }

    listPackages(): Array<Package> {
        if (!this.localRepo) {
            throw Error(`${this.name} not loaded`)
        }

        return this.localRepo.listPackages();
    }
}
