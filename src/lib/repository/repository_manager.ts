import * as log from "https://deno.land/std/log/mod.ts";

import t from '../i18n.ts'

import Config from "../config.ts";
import Package from "../package/package.ts";

import Repository from "./repository.ts";
import ChainRepository from "./chain_repository.ts";
import RepositoryFactory from "./repository_factory.ts";
import Repositories from "./repositories.ts";
import {EmptyRepository} from "./empty_repository.ts";
import GitUtils from "../utils/git_utils.ts";

export default class RepositoryManager {
    private repoFactory: RepositoryFactory
    private extraRepos: Set<string> = new Set<string>()
    private tempRepos: Set<string> = new Set<string>()

    repositories = new Repositories()

    constructor(private config: Config) {
        this.repoFactory = new RepositoryFactory(config)
    }

    async init({extraRepos, tempRepos}: { extraRepos: string[]; tempRepos?: string[]; }): Promise<Repository[]> {
        log.debug("")
        log.debug(`=== RepositoryManager.init - extraRepos: ${JSON.stringify(extraRepos)} tempRepos: ${JSON.stringify(tempRepos)}`)
        log.debug(`extraRepos: ${JSON.stringify(extraRepos)}`)
        log.debug(`tempRepos: ${JSON.stringify(tempRepos)}`)

        if (extraRepos) {
            // this.extraRepos.clear()
            extraRepos.forEach(repo => this.extraRepos.add(repo))
        }

        if (tempRepos) {
            tempRepos.forEach(repo => this.tempRepos.add(repo))
        }

        await this.createRepositories()
        return await this.initRepositories()
    }

    async reload(): Promise<void> {
        this.invalidatePackages()
        await this.createRepositories()
        await this.initRepositories()
    }

    async reloadCurrentDir(): Promise<void> {
        await (await this.createCurrentDirRepo()).init()
    }

    get saveState(): any {
        return [...this.extraRepos]
    }

    set saveState(state: any) {
        this.extraRepos = new Set<string>(state)
        if (this.extraRepos) {
            log.debug(t("lib.repository.repository_manager.loaded", { repos: JSON.stringify([...this.extraRepos])}))
        }
    }

    async currentDirPackage(): Promise<Package | undefined> {
        if (!this.repositories.currentDir) {
            return undefined
        }

        // Looking for package at current dir
        if (!this.repositories.currentDir.initialized()) {
            await this.repositories.currentDir.init()
        }
        const pkgs = this.repositories.currentDir.listPackages()
        if (pkgs && pkgs.length == 1) {
            return this.repositories.currentDir.resolvePackage(pkgs[0].name)
        }

        // TODO: Could we provide a default mechanism?
        if (pkgs && pkgs.length > 1) {
            log.warn("")
            log.warn(t("lib.repository.repository_manager.currentMultiple", { chosen: pkgs[0].filePath, choices: pkgs.map(p => p.filePath) }))
            return this.repositories.currentDir.resolvePackage(pkgs[0].name)
        }

        return undefined
    }

    get repository(): Repository {
        if (!this.repositories.regular) {
            throw Error(t("lib.repository.repository_manager.notInitialized"))
        }

        return this.repositories.regular
    }

    set repository(repo: Repository) {
        log.warn(t("lib.repository.repository_manager.testOnly", { repo: repo.name }));
        this.repositories.regular = repo;
    }

    get repositoryInstalled(): Repository {
        if (!this.repositories.installed) {
            throw Error(t("lib.repository.repository_manager.notInitialized"))
        }

        return this.repositories.installed
    }

    ////////////////////////////////////////////////////////////////////////////////
    private invalidatePackages() {
        if (!this.repositories) {
            throw Error(t("lib.repository.repository_manager.notFound"))
        }

        let repos: any = this.repositories;
        for (let key in repos) {
            if (repos[key]) {
                let repo: Repository = repos[key]
                log.debug(`INVALIDATE-PACKAGES Repo[${key}] - ${repo.name}`)
                repo.reload()
            }
        }
    }

    private async createRepositories(): Promise<void> {
        log.debug("");
        log.debug("=== createRepositories");

        await this.createInstalledRepo()
        await this.createRegularRepositories()
        await this.createCurrentDirRepo()
    }

    private async initRepositories(): Promise<Repository[]> {
        log.debug("");
        log.debug("=== initRepositories");

        if (!this.repositories) {
            throw Error(t("lib.repository.repository_manager.notFound"))
        }

        let repos: any = this.repositories
        log.debug(`## repos: ${this.repositories?.describe()}`)

        let initializedRepositories: Repository[] = []

        for (let key in repos) {
            if (repos[key]) {
                let repo: Repository = repos[key]
                if (!repo.initialized()) {
                    log.debug(`INIT Repo[${key}] - ${repo.describe()} initialized? ${repo.initialized()}`)
                    await repo.init()
                    initializedRepositories.push(repo)
                }
                log.debug(`Repo[${key}] - ${repo.describe()} initialized? ${repo.initialized()}`)
            }
        }
        this.logRepos(repos);

        return initializedRepositories
    }

    private logRepos(repos: any) {
        log.debug(`=== REPOS`)
        for (let key in repos) {
            if (repos[key]) {
                log.debug(`Repo[${key}] - ${repos[key].name}`)
            }
        }
    }

    public async createCurrentDirRepo(): Promise<Repository> {
        const currentDir = Deno.cwd()
        let dirs = [currentDir]

        const gitDir = GitUtils.gitRoot(currentDir)
        if (gitDir) {
            dirs.push(gitDir)
        }

        log.debug(`createCurrentDirRepo ${dirs}`)
        const currentDirRepo = await this.createRepos(dirs, true)
        this.repositories.currentDir = currentDirRepo
        return currentDirRepo
    }

    public async createInstalledRepo(): Promise<Repository> {
        log.debug("createInstalledRepo")
        let repos = await this.repoList(true)
        return this.repositories.installed = await this.createRepos(repos)
    }

    public async createRegularRepositories(): Promise<Repository> {
        log.debug("createRegularRepository")
        let repos = await this.repoList(false)
        return this.repositories.regular = await this.createRepos(repos)
    }

    public async repoList(installedOnly: boolean): Promise<string[]> {
        let repos: string[] = [];

        if (installedOnly) {
            this.addLevainRegistryRepo(repos)
        } else {
            this.addLevainRepo(repos)
            this.addTempRepos(repos)
            this.addExtraRepos(repos)
        }

        return [...new Set(repos)]
    }

    private addLevainRepo(repos: string[]) {
        log.debug(`addRepo DEFAULT ${this.config.levainSrcDir} --> Levain src dir`)
        repos.push(this.config.levainSrcDir)
    }

    private addLevainRegistryRepo(repos: string[]) {
        log.debug(`addRepo DEFAULT ${this.config.levainRegistryDir} --> Levain registry dir`)
        repos.push(this.config.levainRegistryDir)
    }

    private addExtraRepos(repos: string[]) {
        log.debug(`addRepo ${[...this.extraRepos]} --> addRepo`)
        this.extraRepos.forEach(repo => repos.push(repo))
    }

    private addTempRepos(repos: string[]) {
        log.debug(`addRepo ${[...this.tempRepos]} --> tempRepo`)
        this.tempRepos.forEach(repo => repos.push(repo))
    }

    private async createRepos(repoDirs: string[], rootOnly: boolean = false): Promise<Repository> {
        let repoArr: Repository[] = []
        for (let repoPath of RepositoryFactory.normalizeList(repoDirs)) {
            repoArr.push(await this.repoFactory.getOrCreate(repoPath, rootOnly))
        }

        const repoCount = repoArr.length
        if (repoCount === 0) {
            return new EmptyRepository()
        }

        if (repoCount === 1) {
            return repoArr[0]
        }

        const repo = new ChainRepository(this.config, repoArr)
        await repo.init()
        return repo
    }
}
