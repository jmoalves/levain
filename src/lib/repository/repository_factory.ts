import * as log from "@std/log";
import type Config from "../config.ts";
import OsUtils from "../os/os_utils.ts";
import GitUtils from "../utils/git_utils.ts";

import type Repository from "./repository.ts";


export default class RepositoryFactory {
  static knownRepos = new Map<string, Repository>();

  static isGitPath(repoPath: string): boolean {
    return GitUtils.isGitPath(repoPath);
  }

  static isZipPath(repoPath: string): boolean {
    return repoPath.endsWith(".zip");
  }

  static normalizeList(repoPaths: string[]): string[] {
    const repos = new Set<string>();
    repoPaths.map((repo) => RepositoryFactory.normalize(repo))
      .forEach((repo) => repos.add(repo));
    return [...repos];
  }

  static normalize(repoPath: string): string {
    if (RepositoryFactory.isGitPath(repoPath)) {
      return repoPath;
    }

    // Should normalize path separators (\, /) as well?

    if (!OsUtils.isWindows()) {
      return repoPath;
    }

    return repoPath.toLowerCase().trim();
  }

  static async getOrCreate(config: Config, repoURI: string, rootOnly: boolean = false): Promise<Repository> {
    log.debug(`RepoFactory.create - repo for uri ${repoURI}`);

    if (!repoURI) {
      throw "RepoFactory with no repoURI";
    }

    const repoPath = RepositoryFactory.normalize(repoURI);
    if (RepositoryFactory.knownRepos.has(repoPath)) {
      const repo = RepositoryFactory.knownRepos.get(repoPath)!;
      log.debug(`Reusing repo ${repo.describe()}`);
      return repo;
    }

    let repo: Repository;
    if (RepositoryFactory.isGitPath(repoPath)) {
      const { GitRepository } = await import("./git_repository.ts"); 
      repo = new GitRepository(config, repoPath, rootOnly);
    } else if (RepositoryFactory.isZipPath(repoPath)) {
      const { ZipRepository } = await import("./zip_repository.ts"); 
      repo = new ZipRepository(config, repoPath, rootOnly);
    } else {
      const { FileSystemRepository } = await import("./file_system_repository.ts"); 
      repo = new FileSystemRepository(config, repoPath, rootOnly);
    }

    await repo.init();

    RepositoryFactory.knownRepos.set(repoPath, repo);
    return repo;
  }
}
