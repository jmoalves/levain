import * as log from "https://deno.land/std/log/mod.ts";
import { dirname } from "https://deno.land/std/path/mod.ts";

import Config from "../config.ts";
import Package from "../package/package.ts";
import LevainReleases from "../releases/levain_releases.ts";
import LevainVersion from "../../levain_version.ts";

import Repository from "./repository.ts";
import CacheRepository from "./cache_repository.ts";
import ChainRepository from "./chain_repository.ts";
import RepositoryFactory from "./repository_factory.ts";

class Repositories {
    regular: Repository|undefined = undefined
    installed: Repository|undefined = undefined
    currentDir: Repository|undefined = undefined
}

const TURN_OFF_AUTO_UPDATE = true;
let update_warning = true;

export default class RepositoryManager {
    private repoFactory: RepositoryFactory
    private extraRepos: Set<string> = new Set<string>()
    private tempRepos: Set<string> = new Set<string>()

    private repositories = new Repositories()

    constructor(private config: Config) {
        this.repoFactory = new RepositoryFactory(config)
    }

    async init({ repos, tempRepos, skipLevainUpdates = false }: { repos: string[]; tempRepos?: string[]; skipLevainUpdates?: boolean; }) {
        log.debug("")
        log.debug(`=== RepositoryManager.init - extraRepos: ${JSON.stringify(repos)}`)

        if (repos) {
            repos.forEach(repo => this.extraRepos.add(repo))
        }

        if (tempRepos) {
            tempRepos.forEach(repo => this.tempRepos.add(repo))
        }

        await this.createRepositories(skipLevainUpdates)
        await this.initRepositories()
    }

    invalidatePackages() {
        if (!this.repositories) {
            throw Error("Error initializing RepositoryManager - repositories not found")
        }

        let repos: any = this.repositories;
        for (let key in repos) {
            if (repos[key]) {
                let repo:Repository = repos[key]
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
        let pkgs = this.repositories.currentDir.listPackages()
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
    async createRepositories(skipLevainUpdates: boolean = false): Promise<void> {
        log.info("");
        log.info("===");
        await this.createInstalledRepo(skipLevainUpdates)
        await this.createRegularRepository(skipLevainUpdates)

        await this.createCurrentDirRepo()
    }

    async initRepositories(): Promise<void> {
        log.info("");
        log.info("===");

        if (!this.repositories) {
            throw Error("Error initializing RepositoryManager - repositories not found")
        }

        let repos: any = this.repositories;
        for (let key in repos) {
            if (repos[key]) {
                let repo:Repository = repos[key]
                log.debug(`Repo[${key}] - ${repo.name}`)
                await repo.init()    
            }
        }

        log.info(`=== REPOS`)
        for (let key in repos) {
            if (repos[key]) {
                log.info(`Repo[${key}] - ${repos[key].name}`)
            }
        }
    }

    private async createCurrentDirRepo() {
        log.debug("createCurrentDirRepo")
        this.repositories.currentDir = this.repoFactory.create(Deno.cwd(), true)
    }

    private async createInstalledRepo(skipLevainUpdates: boolean = false) {
        log.debug("createInstalledRepo")
        let repos = await this.repoList(true, skipLevainUpdates)
        this.repositories.installed = this.createRepos(repos)
    }

    private async createRegularRepository(skipLevainUpdates: boolean = false) {
        log.debug("createRegularRepository")
        let repos = await this.repoList(false, skipLevainUpdates)
        this.repositories.regular = this.createRepos(repos)
    }

    private async repoList(installedOnly: boolean, skipLevainUpdates: boolean = false): Promise<string[]> {
        let repos: string[] = [];

        if (!skipLevainUpdates) {
            await this.addLevainReleasesRepo(repos)
        }
        this.addLevainRepo(repos)

        if (installedOnly) {
            this.addLevainRegistryRepo(repos)
        } else {
            this.addTempRepos(repos)
            this.addExtraRepos(repos)
        }

        return [...new Set(repos)]
    }

    private async addLevainReleasesRepo(repos: string[]) {
        try {
            let levainReleases = new LevainReleases(this.config)
            let latestVersion = await levainReleases.latestVersion()
            if (!LevainVersion.needsUpdate(latestVersion)) {
                return
            }

            // Turning off this feature - See https://github.com/jmoalves/levain/issues/57
            if (TURN_OFF_AUTO_UPDATE) {
                if (update_warning) {
                    log.warning("")
                    log.warning("*********************************************************")
                    log.warning("We have a new Levain release available!")
                    log.warning("")
                    log.warning(`- Your version: ${LevainVersion.levainVersion}`)
                    log.warning(`-  New version: ${latestVersion}`)
                    log.warning("*********************************************************")
                    log.warning("")

                    if (this.config.lastKnownVersion != latestVersion) {
                        log.warning("However, Levain auto-update is disabled")
                        log.warning("")
                        prompt(`Hit ENTER to continue with your version`)
                        log.warning("")

                        this.config.lastKnownVersion = latestVersion
                    }

                    update_warning = false
                }

                return
            }

            let url = await levainReleases.releasesRepositoryUrl()
            log.debug(`addRepo DEFAULT ${url} --> Levain releases repo`)
            repos.push(url)
        } catch(error) {
            log.debug(`Error ${JSON.stringify(error)}`)
            log.info(`Ignoring Levain updates`)
        }
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
