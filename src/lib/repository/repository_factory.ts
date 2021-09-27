import * as log from "https://deno.land/std/log/mod.ts";
import Config from '../config.ts';
import OsUtils from "../os/os_utils.ts";
import GitUtils from "../utils/git_utils.ts";

import Repository from './repository.ts'
import GitRepository from './git_repository.ts';
import FileSystemRepository from './file_system_repository.ts';
import ZipRepository from "./zip_repository.ts";

export default class RepositoryFactory {
    static knownRepos = new Map<string, Repository>()

    constructor(private config: Config) {
    }

    static isGitPath(repoPath: string): boolean {
        return GitUtils.isGitPath(repoPath)
    }

    static isZipPath(repoPath: string): boolean {
        return repoPath.endsWith(".zip")
    }

    static normalizeList(repoPaths: string[]): string[] {
        let repos = new Set<string>()
        repoPaths.map(repo => RepositoryFactory.normalize(repo))
            .forEach(repo => repos.add(repo))
        return [...repos]
    }

    static normalize(repoPath: string): string {
        if (RepositoryFactory.isGitPath(repoPath)) {
            return repoPath
        }

        // Should normalize path separators (\, /) as well?

        if (!OsUtils.isWindows()) {
            return repoPath
        }

        return repoPath.toLowerCase().trim()
    }

    getOrCreate(repoURI: string, rootOnly: boolean = false): Repository {
        log.debug(`RepoFactory.create - repo for uri ${repoURI}`)

        if (!repoURI) {
            throw "RepoFactory with no repoURI"
        }

        let repoPath = RepositoryFactory.normalize(repoURI)
        if (RepositoryFactory.knownRepos.has(repoPath)) {
            let repo = RepositoryFactory.knownRepos.get(repoPath)!
            log.debug(`Reusing repo ${repo.describe()}`)
            return repo
        }

        let repo: Repository
        if (RepositoryFactory.isGitPath(repoPath)) {
            repo = new GitRepository(this.config, repoPath, rootOnly)
        } else if (RepositoryFactory.isZipPath(repoPath)) {
            repo = new ZipRepository(this.config, repoPath, rootOnly)
        } else {
            repo = new FileSystemRepository(this.config, repoPath, rootOnly)
        }

        RepositoryFactory.knownRepos.set(repoPath, repo)
        return repo
    }
}
