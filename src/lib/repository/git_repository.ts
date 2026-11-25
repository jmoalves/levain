import * as log from "@std/log";
import * as path from "@std/path";
import { existsSync } from "@std/fs";

import type Package from "../package/package.ts";
import type Config from "../config.ts";
import GitUtils from "../utils/git_utils.ts";

import AbstractRepository from "./abstract_repository.ts";
import type Repository from "./repository.ts";
import RepositoryFactory from "./repository_factory.ts";

export class GitRepository extends AbstractRepository {
  public static readonly DEFAULT_UPDATE_TTL_SECONDS = 60;

  private readonly gitUtils: GitUtils;

  private readonly localDir: string;
  private localRepo: Repository | undefined;

  constructor(
    private config: Config,
    private rootUrl: string,
    private rootOnly: boolean = false,
    private forceRefresh: boolean = false,
  ) {
    super("GitRepo", rootUrl);

    log.debug(`GitRepo: Root=${this.rootUrl}`);

    this.gitUtils = new GitUtils();
    this.localDir = path.resolve(
      this.config.configPaths.levainConfigDir,
      "gitRepos",
      GitUtils.localBaseDir(this.rootUrl),
    );
  }

  static updateTtlSeconds(): number {
    const raw = Deno.env.get("LEVAIN_GIT_UPDATE_TTL_SECONDS");
    if (raw === undefined || raw.trim() === "") {
      return GitRepository.DEFAULT_UPDATE_TTL_SECONDS;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : GitRepository.DEFAULT_UPDATE_TTL_SECONDS;
  }

  private isWithinUpdateTtl(): boolean {
    const ttlSeconds = GitRepository.updateTtlSeconds();
    if (ttlSeconds <= 0) {
      return false;
    }

    const candidates = [
      path.join(this.localDir, ".git", "FETCH_HEAD"),
      path.join(this.localDir, ".git", "HEAD"),
    ];

    for (const marker of candidates) {
      try {
        const stat = Deno.statSync(marker);
        if (stat.mtime) {
          const ageMs = Date.now() - stat.mtime.getTime();
          if (ageMs >= 0 && ageMs < ttlSeconds * 1000) {
            log.debug(`GitRepo: skipping update for ${this.rootUrl} (fresh within ${ttlSeconds}s TTL)`);
            return true;
          }
          return false;
        }
      } catch {
        // Marker not found — try fallback
      }
    }

    return false;
  }

  async init(): Promise<void> {
    if (existsSync(this.localDir)) {
      if (this.forceRefresh || !this.isWithinUpdateTtl()) {
        try {
          await this.gitUtils.update(this.localDir);
        } catch (error) {
          log.info(`Ignoring GIT error and moving on. Error:${error}`);
        }
      }
    } else {
      await this.gitUtils.clone(this.rootUrl, this.localDir, true);
    }

    this.localRepo = await RepositoryFactory.getOrCreate(this.config, this.localDir, this.rootOnly);

    this.setInitialized();
  }

  listPackages(): Array<Package> {
    if (!this.localRepo) {
      throw Error(`${this.name} not loaded`);
    }

    return this.localRepo.listPackages();
  }

  resolvePackage(packageName: string): Package | undefined {
    if (!this.localRepo) {
      throw Error(`${this.name} not loaded`);
    }

    return this.localRepo.resolvePackage(packageName);
  }

  // deno-lint-ignore require-await
  async reload(): Promise<void> {
    return this.localRepo?.reload();
  }
}
