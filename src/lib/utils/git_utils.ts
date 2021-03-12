import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import Config from "../config.ts";
import ExtraBin from "../extra_bin.ts";
import OsUtils from "../os/os_utils.ts";

export default class GitUtils {
    static readonly GIT_REG_EXP = /(?<url>.*\.git)(:?#(?<branch>.+))?$/
    readonly gitCmd: string;

    constructor(private config: Config) {
        this.gitCmd = `${ExtraBin.gitDir}\\cmd\\git.exe`;
    }

    static isGitPath(gitUrl: string): boolean {
        return GitUtils.parseGitPath(gitUrl) != null
    }

    static parseGitPath(gitUrl: string): any {
        return gitUrl.match(GitUtils.GIT_REG_EXP)?.groups
    }

    static localBaseDir(gitUrl: string): string {
        let gitPath = GitUtils.parseGitPath(gitUrl)
        let gitBase = gitPath.url.replace(/\.git$/, '')
        if (gitPath.branch) {
            gitBase += '_' + gitPath.branch
        }
        return gitBase.replace(/(?:\/|\\|:|@| )+/g, '_')
    }

    async clone(gitUrl: string, dst: string, options?: any) {
        this.checkGitPath(gitUrl)

        const gitPath = GitUtils.parseGitPath(gitUrl)
        log.info(`-- GIT - CLONE - ${JSON.stringify(gitPath)} => ${dst}`);
        OsUtils.onlyInWindows();

        const branchOption = ( gitPath.branch ? `--branch ${gitPath.branch} ` : '')
        // We must have NO spaces after ${branchOption} in the command below
        const command = `cmd /u /c ${this.gitCmd} clone --progress ${branchOption}--single-branch --no-tags --depth 1 ${gitPath.url} ${dst}`;
        await OsUtils.runAndLog(command);
    }

    async pull(dir: string, options?: any) {
        log.info(`-- GIT - PULL - ${dir}`);
        OsUtils.onlyInWindows();

        const command = `cmd /u /c pushd ${dir} && ${this.gitCmd} pull --force -q --progress --no-tags --depth=1 --update-shallow --allow-unrelated-histories --no-commit --rebase && popd`;
        let tries = 0;
        do {
            tries++;
            if (tries > 1) {
                log.info(`-- GIT - PULL - ${dir} - RETRY`);
            }

            try {
                await OsUtils.runAndLog(command);

                log.info(`-- GIT - PULL - ${dir} - OK`);
                log.info("");
                return;
            } catch (error) {
                log.info(`${tries} - git error - ${error}`)
            }
        } while (tries < 3)

        throw Error(`Unable to GIT PULL ${dir}`)
    }

    checkGitPath(url: string) {
        if (!GitUtils.isGitPath(url)) {
            throw new Error(`Invalid git url - ${url}`)
        }
    }
}
