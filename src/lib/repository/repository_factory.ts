import * as log from "@std/log";
import * as path from "@std/path";
import type Config from "../config.ts";
import OsUtils from "../os/os_utils.ts";
import GitUtils from "../utils/git_utils.ts";
import HttpUtils from "../utils/http_utils.ts";

import type Repository from "./repository.ts";

class ScopedRepoCache extends Map<string, Repository> {
  constructor(private readonly onClear: () => void) {
    super();
  }

  override clear(): void {
    super.clear();
    this.onClear();
  }
}

export default class RepositoryFactory {
  private static reposByConfig = new WeakMap<Config, Map<string, Repository>>();
  private static inFlightByConfig = new WeakMap<Config, Map<string, Promise<Repository>>>();
  static knownRepos: Map<string, Repository> = new ScopedRepoCache(() => {
    RepositoryFactory.reposByConfig = new WeakMap<Config, Map<string, Repository>>();
    RepositoryFactory.inFlightByConfig = new WeakMap<Config, Map<string, Promise<Repository>>>();
  });

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

    if (!OsUtils.isWindows()) {
      return repoPath;
    }

    return repoPath.toLowerCase().trim();
  }

  private static buildCacheKey(repoPath: string, rootOnly: boolean): string {
    let canonical = repoPath;
    if (RepositoryFactory.isGitPath(repoPath)) {
      // Deduplicate URLs that map to the same local mirror dir (including case variants on Windows)
      canonical = OsUtils.isWindows()
        ? GitUtils.localBaseDir(repoPath).toLowerCase()
        : GitUtils.localBaseDir(repoPath);
    } else if (!HttpUtils.isUrl(repoPath)) {
      const resolved = path.resolve(repoPath);
      canonical = OsUtils.isWindows() ? resolved.toLowerCase() : resolved;
    }
    return `${canonical}|rootOnly=${rootOnly}`;
  }

  static async getOrCreate(
    config: Config,
    repoURI: string,
    rootOnly: boolean = false,
    forceRefresh: boolean = false,
  ): Promise<Repository> {
    log.debug(`RepoFactory.create - repo for uri ${repoURI}`);

    if (!repoURI) {
      throw new Error("RepoFactory with no repoURI");
    }

    const repoPath = RepositoryFactory.normalize(repoURI);
    const cacheKey = RepositoryFactory.buildCacheKey(repoPath, rootOnly);

    let configCache = RepositoryFactory.reposByConfig.get(config);
    if (!configCache) {
      configCache = new Map<string, Repository>();
      RepositoryFactory.reposByConfig.set(config, configCache);
    }

    if (configCache.has(cacheKey)) {
      const repo = configCache.get(cacheKey)!;
      log.debug(`Reusing repo ${repo.describe()}`);
      return repo;
    }

    let inFlight = RepositoryFactory.inFlightByConfig.get(config);
    if (!inFlight) {
      inFlight = new Map<string, Promise<Repository>>();
      RepositoryFactory.inFlightByConfig.set(config, inFlight);
    }

    const existingPromise = inFlight.get(cacheKey);
    if (existingPromise) {
      return await existingPromise;
    }

    const initPromise = (async () => {
      let repo: Repository;
      if (RepositoryFactory.isGitPath(repoPath)) {
        const { GitRepository } = await import("./git_repository.ts");
        repo = new GitRepository(config, repoPath, rootOnly, forceRefresh);
      } else if (RepositoryFactory.isZipPath(repoPath)) {
        const { ZipRepository } = await import("./zip_repository.ts");
        repo = new ZipRepository(config, repoPath, rootOnly);
      } else {
        const { FileSystemRepository } = await import("./file_system_repository.ts");
        repo = new FileSystemRepository(config, repoPath, rootOnly);
      }

      await repo.init();
      configCache!.set(cacheKey, repo);
      RepositoryFactory.knownRepos.set(cacheKey, repo);
      return repo;
    })();

    inFlight.set(cacheKey, initPromise);
    try {
      return await initPromise;
    } finally {
      inFlight.delete(cacheKey);
    }
  }
}
