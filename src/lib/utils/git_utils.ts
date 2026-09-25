import * as log from "@std/log";
import * as path from "@std/path";

import ExtraBin from "../paths/extra_bin.ts";
import OsUtils from "../os/os_utils.ts";
import { Timer } from "../timer.ts";

import ConsoleFeedback from "./console_feedback.ts";
import t from "../i18n.ts";

export default class GitUtils {
  static readonly GIT_REG_EXP = /(?<url>.*\.git)(:?#(?<branch>.+))?$/;
  static readonly GITHUB_REG_EXP = /^(git@.*:|https:\/\/.*\/)(?<user>[^/]+)\/(?<repo>[^.]+)\.git$/;

  readonly gitCmd: string;

  readonly feedback = new ConsoleFeedback();

  constructor() {
    if (OsUtils.isWindows()) {
      this.gitCmd = `${ExtraBin.gitDir}\\cmd\\git.exe`;
    } else {
      this.gitCmd = `/usr/bin/git`;
    }
  }

  static isGitPath(gitUrl: string): boolean {
    return GitUtils.parseGitPath(gitUrl) != null;
  }

  static parseGitPath(gitUrl: string): any {
    const result = gitUrl.match(GitUtils.GIT_REG_EXP)?.groups;
    if (!result) {
      return undefined;
    }

    let urlGroups: any = undefined;
    if (result.url) {
      urlGroups = result.url.match(GitUtils.GITHUB_REG_EXP)?.groups;
    }

    if (urlGroups) {
      for (const key in urlGroups) {
        result[key] = urlGroups[key];
      }
    }

    return result;
  }

  static localBaseDir(gitUrl: string): string {
    GitUtils.checkGitPath(gitUrl);

    const gitPath = GitUtils.parseGitPath(gitUrl);
    let gitBase = gitPath.url.replace(/\.git$/, "");
    if (gitPath.branch) {
      gitBase += "_" + gitPath.branch;
    }
    return gitBase.replace(/[\/\\:@ ]+/g, "_");
  }

  async clone(gitUrl: string, dst: string, shallow = false): Promise<void> {
    GitUtils.checkGitPath(gitUrl);

    const gitPath = GitUtils.parseGitPath(gitUrl);
    log.debug(`# GIT - CLONE - ${JSON.stringify(gitPath)} => ${dst}`);

    const timer = new Timer();
    this.feedback.start(`# GIT - CLONE - ${JSON.stringify(gitPath)} => ${dst}`);
    const tick = setInterval(() => this.feedback.show(), 300);

    const branchOption = gitPath.branch ? `--branch ${gitPath.branch} ` : "";
    const shallowOption = shallow ? `--single-branch --no-tags --depth 1 ` : "";
    // We must have NO spaces after ${branchOption} in the command below
    let gitCommand =
      `${this.gitCmd} clone --progress --config core.autocrlf=true ${branchOption}${shallowOption}${gitPath.url} ${dst}`;
    if (OsUtils.isWindows()) {
      gitCommand = `cmd /u /c ${gitCommand}`;
    }
    try {
      await OsUtils.runAndLog(gitCommand);
    } catch (err) {
      clearInterval(tick);
      throw err;
    }

    clearInterval(tick);
    this.feedback.reset(`# GIT - CLONE - ${JSON.stringify(gitPath)} => ${dst} (${timer.humanize()})`);
  }

  private async updateIfNeeded(workingDir: string): Promise<boolean> {
    let remoteName: string;
    let branchName: string;

    try {
      const upstream = (
        await OsUtils.runAndLog(
          [this.gitCmd, "rev-parse", "--abbrev-ref", "@{u}"],
          workingDir,
        )
      ).trim();

      const slashIndex = upstream.indexOf("/");

      if (slashIndex < 0) {
        throw new NonRetryableGitError(t("lib.utils.git_utils.invalid_upstream", { workingDir, upstream }));
      }

      remoteName = upstream.substring(0, slashIndex);
      branchName = upstream.substring(slashIndex + 1);
    } catch {
      branchName = (
        await OsUtils.runAndLog(
          [this.gitCmd, "branch", "--show-current"],
          workingDir,
        )
      ).trim();

      if (!branchName) {
        throw new NonRetryableGitError(t("lib.utils.git_utils.no_current_branch", { workingDir }));
      }

      remoteName = "origin";

      log.debug(t("lib.utils.git_utils.no_upstream", { workingDir, remoteName, branchName }));
    }

    await OsUtils.runAndLog(
      [
        this.gitCmd,
        "fetch",
        "--quiet",
        "--no-tags",
        remoteName,
        branchName,
      ],
      workingDir,
    );

    const headSha = (
      await OsUtils.runAndLog(
        [this.gitCmd, "rev-parse", "HEAD"],
        workingDir,
      )
    ).trim();

    const remoteSha = (
      await OsUtils.runAndLog(
        [this.gitCmd, "rev-parse", "FETCH_HEAD"],
        workingDir,
      )
    ).trim();

    if (headSha === remoteSha) {
      return false;
    }

    // Is local behind remote?
    try {
      await OsUtils.runAndLog(
        [this.gitCmd, "merge-base", "--is-ancestor", "HEAD", "FETCH_HEAD"],
        workingDir,
      );

      log.debug(t("lib.utils.git_utils.updating", { workingDir, branchName, headSha, remoteSha }));

      // Fast-forward only. Never rewrite or merge.
      await OsUtils.runAndLog(
        [this.gitCmd, "merge", "--ff-only", "FETCH_HEAD"],
        workingDir,
      );

      return true;
    } catch {
      // HEAD is not an ancestor of FETCH_HEAD
    }

    // Is remote behind local?
    let message = t("lib.utils.git_utils.commits_diverged", { workingDir, remoteName, branchName });
    try {
      await OsUtils.runAndLog(
        [this.gitCmd, "merge-base", "--is-ancestor", "FETCH_HEAD", "HEAD"],
        workingDir,
      );


      throw new NonRetryableGitError(message);
    } catch (error) {
      if (
        error instanceof NonRetryableGitError &&
        error.message.includes(message)
      ) {
        throw error;
      }
    }

    // Neither side is ancestor of the other => diverged
    message =  t("lib.utils.git_utils.commits_diverged", { workingDir, remoteName, branchName });
    throw new NonRetryableGitError(message);
  }

  async update(workingDir: string) {
    log.debug(`# GIT - UPDATE - ${workingDir}`);

    const timer = new Timer();
    this.feedback.start(`# GIT - UPDATE - ${workingDir}`);
    const tick = setInterval(() => this.feedback.show(), 300);
    
    let tries = 0;
    do {
      tries++;
      if (tries > 1) {
        log.debug(`# GIT - UPDATE - ${workingDir} - RETRY`);
      }

      try {
        const updated = await this.updateIfNeeded(workingDir);
        clearInterval(tick);
        if (updated) {
          log.debug(
            `# GIT - UPDATED - ${workingDir} (${timer.humanize()})`,
          );
          this.feedback.reset(
            `# GIT - UPDATED - ${workingDir} (${timer.humanize()})`,
          );
        } else {
          log.debug(
            `# GIT - UP TO DATE - ${workingDir} (${timer.humanize()})`,
          );
          this.feedback.reset(
            `# GIT - UP TO DATE - ${workingDir} (${timer.humanize()})`,
          );
        }

        return;
      } catch (error) {
        log.error(`git error - try ${tries} - ${error}`);
        if (error instanceof NonRetryableGitError) {
          tries = 3;
        }
      }
    } while (tries < 3);

    clearInterval(tick);
    throw Error(t("lib.utils.git_utils.unable_to_update", { workingDir }));
  }

  static checkGitPath(url: string) {
    if (!GitUtils.isGitPath(url)) {
      throw new Error(`Invalid git url - ${url}`);
    }
  }

  static gitRoot(startDir: string): string | undefined {
    let dir = startDir;

    do {
      try {
        const gitdir = path.resolve(dir, ".git");
        log.debug(`Looking for .git at ${gitdir}`);
        const fileInfo = Deno.lstatSync(gitdir);
        if (fileInfo.isDirectory) {
          log.debug(`Found .git at ${gitdir} - using ${dir}`);
          return dir;
        }
      } catch (err) {
        if (!(err instanceof Deno.errors.NotFound)) {
          throw err;
        }
      }

      const parentDir = path.dirname(dir);
      if (parentDir == dir) {
        return undefined;
      }

      dir = parentDir;
      log.debug(`Parent: ${dir}`);
    } while (dir.length > 0);

    return undefined;
  }
}


class NonRetryableGitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonRetryableGitError";
  }
}
