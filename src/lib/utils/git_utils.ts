import * as log from "https://deno.land/std/log/mod.ts";
import ExtraBin from "../extra_bin.ts";
import OsUtils from "../os/os_utils.ts";

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

        let gitPath = GitUtils.parseGitPath(gitUrl)
        let gitBase = gitPath.url.replace(/\.git$/, '')
        if (gitPath.branch) {
            gitBase += '_' + gitPath.branch
        }
        return gitBase.replace(/[\/\\:@ ]+/g, '_')
    }

    async clone(gitUrl: string, dst: string, shallow: boolean = false): Promise<void> {
        GitUtils.checkGitPath(gitUrl)

        const gitPath = GitUtils.parseGitPath(gitUrl)
        log.debug(`# GIT - CLONE - ${JSON.stringify(gitPath)} => ${dst}`);

        this.feedback.start(`# GIT - CLONE - ${JSON.stringify(gitPath)} => ${dst}`)
        let tick = setInterval(() => this.feedback.show(), 300)

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
        this.feedback.reset(`# GIT - CLONE - ${JSON.stringify(gitPath)} => ${dst} - OK`)
    }

    async pull(workingDir: string) {
        log.debug(`# GIT - PULL - ${workingDir}`);

        this.feedback.start(`# GIT - PULL - ${workingDir}`)
        let tick = setInterval(() => this.feedback.show(), 300)

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
                // BROKEN? await OsUtils.runAndLog(gitCommand, workingDir);
                await OsUtils.runAndLog(gitCommand);
                clearInterval(tick)

                log.debug(`# GIT - PULL - ${workingDir} - OK`);
                log.debug("");

                this.feedback.reset(`# GIT - PULL - ${workingDir} - OK`)
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
}
