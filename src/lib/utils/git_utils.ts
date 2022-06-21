import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import ExtraBin from "../extra_bin.ts";
import OsUtils from "../os/os_utils.ts";
import {Timer} from "../timer.ts";

import ConsoleFeedback from "./console_feedback.ts";

export default class GitUtils {
    static readonly GIT_REG_EXP = /(?<url>.*\.git)(:?#(?<branch>.+))?$/
    readonly gitCmd: string;

    readonly feedback = new ConsoleFeedback();

    constructor() {
        if (OsUtils.isWindows()) {
            this.gitCmd = `${ExtraBin.gitDir}\\cmd\\git.exe`
        } else {
            this.gitCmd = `/usr/bin/git`
        }
    }

    static isGitPath(gitUrl: string): boolean {
        return GitUtils.parseGitPath(gitUrl) != null
    }

    static parseGitPath(gitUrl: string): any {
        return gitUrl.match(GitUtils.GIT_REG_EXP)?.groups
    }

    static localBaseDir(gitUrl: string): string {
        GitUtils.checkGitPath(gitUrl)

        const gitPath = GitUtils.parseGitPath(gitUrl)
        let gitBase = gitPath.url.replace(/\.git$/, '')
        if (gitPath.branch) {
            gitBase += '_' + gitPath.branch
        }
        return gitBase.replace(/[\/\\:@ ]+/g, '_')
    }

    async clone(gitUrl: string, dst: string, shallow = false): Promise<void> {
        GitUtils.checkGitPath(gitUrl)

        const gitPath = GitUtils.parseGitPath(gitUrl)
        log.debug(`# GIT - CLONE - ${JSON.stringify(gitPath)} => ${dst}`);

        const timer = new Timer()
        this.feedback.start(`# GIT - CLONE - ${JSON.stringify(gitPath)} => ${dst}`)
        const tick = setInterval(() => this.feedback.show(), 300)

        const branchOption = (gitPath.branch ? `--branch ${gitPath.branch} ` : '')
        const shallowOption = (shallow ? `--single-branch --no-tags --depth 1 ` : '')
        // We must have NO spaces after ${branchOption} in the command below
        let gitCommand = `${this.gitCmd} clone --progress ${branchOption}${shallowOption}${gitPath.url} ${dst}`;
        if (OsUtils.isWindows()) {
            gitCommand = `cmd /u /c ${gitCommand}`
        }
        try {
            await OsUtils.runAndLog(gitCommand);
        } catch (err) {
            clearInterval(tick)
            throw err
        }

        clearInterval(tick)
        this.feedback.reset(`# GIT - CLONE - ${JSON.stringify(gitPath)} => ${dst} (${timer.humanize()})`)
    }

    async pull(workingDir: string) {
        log.debug(`# GIT - PULL - ${workingDir}`);

        const timer = new Timer()
        this.feedback.start(`# GIT - PULL - ${workingDir}`)
        const tick = setInterval(() => this.feedback.show(), 300)

        let gitCommand: string | string[] = `${this.gitCmd} pull --force -q --progress --no-tags --depth=1 --update-shallow --allow-unrelated-histories --no-commit --rebase`;
        if (OsUtils.isWindows()) {
            gitCommand = `cmd /u /c pushd ${workingDir} && ${gitCommand} && popd`
        }

        let tries = 0;
        do {
            tries++;
            if (tries > 1) {
                log.debug(`# GIT - PULL - ${workingDir} - RETRY`);
            }

            try {
                await OsUtils.runAndLog(gitCommand, workingDir);

                clearInterval(tick)

                log.debug(`# GIT - PULL - ${workingDir} (${timer.humanize()})`);
                log.debug("");

                this.feedback.reset(`# GIT - PULL - ${workingDir} (${timer.humanize()})`)
                return;
            } catch (error) {
                log.error(`git error - try ${tries} - ${error}`)
            }
        } while (tries < 3)

        clearInterval(tick)
        throw Error(`Unable to GIT PULL ${workingDir}`)
    }

    static checkGitPath(url: string) {
        if (!GitUtils.isGitPath(url)) {
            throw new Error(`Invalid git url - ${url}`)
        }
    }

    static gitRoot(startDir: string): string|undefined {
        let dir = startDir

        do {
            try {
                const gitdir = path.resolve(dir, '.git')
                log.debug(`Looking for .git at ${gitdir}`)
                const fileInfo = Deno.lstatSync(gitdir)
                if (fileInfo.isDirectory) {
                    log.debug(`Found .git at ${gitdir} - using ${dir}`)
                    return dir
                }
            } catch (err) {
                if (!(err instanceof Deno.errors.NotFound)) {
                    throw err;
                }
            }

            const parentDir = path.dirname(dir)
            if (parentDir == dir) {
                return undefined
            }

            dir = parentDir
            log.debug(`Parent: ${dir}`)
        } while (dir.length > 0)

        return undefined
    }
}
