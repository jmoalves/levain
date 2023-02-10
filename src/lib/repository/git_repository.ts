import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {existsSync} from "https://deno.land/std/fs/exists.ts";

import Package from '../package/package.ts'
import Config from '../config.ts';
import GitUtils from "../utils/git_utils.ts";

import AbstractRepository from './abstract_repository.ts';
import Repository from "./repository.ts";
import RepositoryFactory from "./repository_factory.ts";

export default class GitRepository extends AbstractRepository {
    private readonly gitUtils: GitUtils

    private repoFactory: RepositoryFactory
    private readonly localDir: string
    private localRepo: Repository | undefined

    constructor(private config: Config, private rootUrl: string, private rootOnly: boolean = false) {
        super('GitRepo', rootUrl)

        log.debug(`GitRepo: Root=${this.rootUrl}`)
        this.repoFactory = new RepositoryFactory(config)

        this.gitUtils = new GitUtils()
        this.localDir = path.resolve(this.config.levainConfigDir, "gitRepos", GitUtils.localBaseDir(this.rootUrl))
    }

    async init(): Promise<void> {
        if (existsSync(this.localDir)) {
            try {
                await this.gitUtils.pull(this.localDir);
            } catch (error) {
                log.info(`Ignoring GIT error and moving on. Error:${error}`)
            }
        } else {
            await this.gitUtils.clone(this.rootUrl, this.localDir, true);
        }

        this.localRepo = await this.repoFactory.getOrCreate(this.localDir, this.rootOnly)

        this.setInitialized()
    }

    listPackages(): Array<Package> {
        if (!this.localRepo) {
            throw Error(`${this.name} not loaded`)
        }

        return this.localRepo.listPackages()
    }

    resolvePackage(packageName: string): Package | undefined {
        if (!this.localRepo) {
            throw Error(`${this.name} not loaded`)
        }

        return this.localRepo.resolvePackage(packageName)
    }

    async reload(): Promise<void> {
        return this.localRepo?.reload()
    }
}
