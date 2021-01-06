import * as log from "https://deno.land/std/log/mod.ts";
import Config from "./config.ts";

import OsUtils from "./os_utils.ts";

export default class GitUtils {
    readonly cmdPath: string;
    readonly gitCmd: string;

    constructor(private config: Config) {
        this.cmdPath = `${this.config.extraBinDir};${this.config.extraBinDir}\\git\\cmd;%PATH%`;
        this.gitCmd = `${this.config.extraBinDir}\\git\\cmd\\git.exe`;
    }

    async clone(url: string, dst: string, options?: any) {
        log.info(`-- GIT - CLONE - ${url} => ${dst}`);
        OsUtils.onlyInWindows();

        const command = `cmd /u /c path ${this.cmdPath} && ${this.gitCmd} clone --single-branch --depth 1 ${url} ${dst}`;
        await OsUtils.runAndLog(command);
    }

    async pull(dir: string, options?: any) {
        log.info(`-- GIT - PULL - ${dir}`);
        OsUtils.onlyInWindows();

        const command = `cmd /u /c path ${this.cmdPath} && pushd ${dir} && ${this.gitCmd} pull && popd`;
        await OsUtils.runAndLog(command);
    }
}
