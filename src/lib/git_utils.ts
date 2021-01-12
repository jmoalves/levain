import * as log from "https://deno.land/std/log/mod.ts";
import Config from "./config.ts";
import ExtraBin from "./extra_bin.ts";

import OsUtils from "./os_utils.ts";

export default class GitUtils {
    readonly gitCmd: string;

    constructor(private config: Config) {
        this.gitCmd = `${ExtraBin.gitDir}\\cmd\\git.exe`;
    }

    async clone(url: string, dst: string, options?: any) {
        log.info(`-- GIT - CLONE - ${url} => ${dst}`);
        OsUtils.onlyInWindows();

        const command = `cmd /u /c ${this.gitCmd} clone --progress --single-branch --no-tags --depth 1 ${url} ${dst}`;
        await OsUtils.runAndLog(command);
    }

    async pull(dir: string, options?: any) {
        log.info(`-- GIT - PULL - ${dir}`);
        OsUtils.onlyInWindows();

        const command = `cmd /u /c pushd ${dir} && ${this.gitCmd} pull --force -q --progress --no-tags --depth=1 --update-shallow --allow-unrelated-histories --no-commit && popd`;
        await OsUtils.runAndLog(command);
    }
}
