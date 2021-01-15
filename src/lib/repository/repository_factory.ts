import * as log from "https://deno.land/std/log/mod.ts";

import Repository from './repository.ts'
import Package from '../package/package.ts'
import Config from '../config.ts';

import NullRepository from './null_repository.ts';
import GitRepository from './git_repository.ts';
import FileSystemRepository from './file_system_repository.ts';
import OsUtils from "../os_utils.ts";

export default class RepositoryFactory {
    private knownRepos = new Map<string, Repository>()

    constructor(private config: Config) {
    }

    static isGitPath(repoPath: string): boolean {
        return repoPath.endsWith(".git")
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

    create(repoURI: string, rootOnly: boolean = false): Repository {
        log.debug(`RepoFactory.create - repo for uri ${repoURI}`)

        if (!repoURI) {
            throw "RepoFactory with no repoURI"
        }

        let repoPath = RepositoryFactory.normalize(repoURI)
        if (this.knownRepos.has(repoPath)) {
            let repo = this.knownRepos.get(repoPath)!
            log.debug(`RepoFactory.create - already known ${repo.name}`)
            return repo
        }

        let repo = undefined;
        if (RepositoryFactory.isGitPath(repoPath)) {
            repo = new GitRepository(this.config, repoPath, rootOnly)
        } else {
            repo = new FileSystemRepository(this.config, repoPath, rootOnly)
        }

        this.knownRepos.set(repoPath, repo)
        return repo
    }
}
