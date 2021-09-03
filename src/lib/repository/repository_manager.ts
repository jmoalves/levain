import * as log from "https://deno.land/std/log/mod.ts";

import Config from "../config.ts";
import Package from "../package/package.ts";

import Repository from "./repository.ts";
import CacheRepository from "./cache_repository.ts";
import ChainRepository from "./chain_repository.ts";
import RepositoryFactory from "./repository_factory.ts";

class Repositories {
    regular: Repository | undefined = undefined
    installed: Repository | undefined = undefined
    currentDir: Repository | undefined = undefined
}

export default class RepositoryManager {
    private repoFactory: RepositoryFactory
    private extraRepos: Set<string> = new Set<string>()
    private tempRepos: Set<string> = new Set<string>()

    private repositories = new Repositories()

    constructor(private config: Config) {
        this.repoFactory = new RepositoryFactory(config)
    }

    async init({repos, tempRepos}: { repos: string[]; tempRepos?: string[]; }) {
        log.debug("")
        log.debug(`=== RepositoryManager.init - extraRepos: ${JSON.stringify(repos)} tempRepos: ${JSON.stringify(tempRepos)}`)

        if (repos) {
            this.extraRepos.clear()
            repos.forEach(repo => this.extraRepos.add(repo))
        }

        if (tempRepos) {
            tempRepos.forEach(repo => this.tempRepos.add(repo))
        }

        await this.createRepositories()
        await this.initRepositories()
    }

    invalidatePackages() {
        if (!this.repositories) {
            throw Error("Error initializing RepositoryManager - repositories not found")
        }

        let repos: any = this.repositories;
        for (let key in repos) {
            if (repos[key]) {
                let repo: Repository = repos[key]
                log.debug(`INVALIDATE-PACKAGES Repo[${key}] - ${repo.name}`)
                repo.invalidatePackages()
            }
        }
    }

    get saveState(): any {
        return [...this.extraRepos]
    }

    set saveState(state: any) {
        this.extraRepos = new Set<string>(state)
        if (this.extraRepos) {
            log.debug(`- Loaded REPOS ${JSON.stringify([...this.extraRepos])}`)
        }
    }

    get currentDirPackage(): Package | undefined {
        if (!this.repositories.currentDir) {
            return undefined
        }

        // Looking for package at current dir
        let pkgs = this.repositories.currentDir.readPackages()
        if (pkgs && pkgs.length == 1) {
            return this.repositories.currentDir.resolvePackage(pkgs[0].name)
        }

        // TODO: Could we provide a default mechanism?
        if (pkgs && pkgs.length > 1) {
            log.warning("")
            log.warning("***********************************************************************************")
            log.warning(`** Found more than one .levain.yaml file in this folder. Which one should I use? => ${pkgs}`)
            log.warning("***********************************************************************************")
            log.warning("")
        }

        return undefined
    }

    get repository(): Repository {
        if (!this.repositories.regular) {
            throw Error("RepositoryManager not initialized")
        }

        return this.repositories.regular
    }

    set repository(repo: Repository) {
        log.warning(`RepositoryManager.repository(${repo.name}) - TEST ONLY!`);
        this.repositories.regular = repo;
    }

    get repositoryInstalled(): Repository {
        if (!this.repositories.installed) {
            throw Error("RepositoryManager not initialized")
        }

        return this.repositories.installed
    }

    ////////////////////////////////////////////////////////////////////////////////
    async createRepositories(): Promise<void> {
        log.debug("");
        log.debug("===");

        await this.createInstalledRepo()
        await this.createRegularRepository()

        await this.createCurrentDirRepo()
    }

    async initRepositories(): Promise<void> {
        log.debug("");
        log.debug("===");

        if (!this.repositories) {
            throw Error("Error initializing RepositoryManager - repositories not found")
        }

        let repos: any = this.repositories;
        for (let key in repos) {
            if (repos[key]) {
                let repo: Repository = repos[key]
                log.debug(`Repo[${key}] - ${repo.name}`)
                await repo.init()
            }
        }

        log.debug(`=== REPOS`)
        for (let key in repos) {
            if (repos[key]) {
                log.debug(`Repo[${key}] - ${repos[key].name}`)
            }
        }
    }

    private async createCurrentDirRepo() {
        log.debug("createCurrentDirRepo")
        this.repositories.currentDir = this.repoFactory.create(Deno.cwd(), true)
    }

    private async createInstalledRepo() {
        log.debug("createInstalledRepo")
        let repos = await this.repoList(true)
        this.repositories.installed = this.createRepos(repos)
    }

    private async createRegularRepository() {
        log.debug("createRegularRepository")
        let repos = await this.repoList(false)
        this.repositories.regular = this.createRepos(repos)
    }

    private async repoList(installedOnly: boolean): Promise<string[]> {
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

    private createRepos(list: string[]): Repository {
        let repoArr: Repository[] = []
        for (let repoPath of RepositoryFactory.normalizeList(list)) {
            repoArr.push(this.repoFactory.create(repoPath))
        }

        return new CacheRepository(this.config,
            new ChainRepository(this.config, repoArr)
        )
    }
}
