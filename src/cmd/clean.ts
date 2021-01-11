import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {emptyDirSync} from "https://deno.land/std/fs/mod.ts";

import Command from "./command.ts";
import Config from "../lib/config.ts";
import {parseArgs} from "../lib/parse_args.ts";
import ConsoleAndFileLogger from "../lib/logger/console_and_file_logger.ts";
import OsUtils from "../lib/os_utils.ts";

export default class CleanCommand implements Command {

    constructor(
        private config: Config,
    ) {
    }

    execute(parameters: string[]): void {
        log.info('CLEAN')

        const myArgs = parseArgs(parameters, {
            boolean: [
                "cache",
                "backup",
                "temp",
                "logs"
            ]
        });

        const noArgs = !parameters.length
        if (myArgs.cache || noArgs) {
            const cacheDir = this.config.levainCacheDir
            log.info(`cleaning cacheDir ${cacheDir}`)
            emptyDirSync(cacheDir)
        }

        if (myArgs.backup || noArgs) {
            const backupDir = this.config.levainBackupDir
            log.info(`cleaning backupDir ${backupDir}`)
            emptyDirSync(backupDir)
        }

        if (myArgs.temp || noArgs) {
            const tempDir = this.config.levainSafeTempDir
            log.info(`cleaning tempDir ${tempDir}`)
            emptyDirSync(tempDir)

            this.cleanOsTempDir();
        }

        if (myArgs.logs || noArgs) {
            log.info(`cleaning logs`)
            this.cleanLogs();
        }
    }

    private cleanOsTempDir() {
        let tempDir = this.getOsTempDir();
        if (!tempDir) {
            return;
        }

        log.info(`cleaning tempDir ${tempDir}`)
        for (const dirEntry of Deno.readDirSync(tempDir)) {
            if (dirEntry.name.match("^levain-temp-.*")) {
                this.removeIgnoringErrors(path.resolve(tempDir, dirEntry.name));
            } else if (dirEntry.isDirectory && dirEntry.name.match("^levain-.*")) {
                this.removeIgnoringErrors(path.resolve(tempDir, dirEntry.name));
            } else if (dirEntry.name.match("^levain$")) {
                this.removeIgnoringErrors(path.resolve(tempDir, dirEntry.name));
            }
        }
    }

    private cleanLogs() {
        let tempDir = this.getOsTempDir();
        if (!tempDir) {
            return;
        }

        log.debug(`cleaning logs at tempDir ${tempDir}`)
        for (const dirEntry of Deno.readDirSync(tempDir)) {
            if (dirEntry.isFile && dirEntry.name.match("^levain-.*\.log")) {
                let dateTag = ConsoleAndFileLogger.logDateTag();
                if (!dirEntry.name.match(`^levain-${dateTag}-.*`)) { // Do not remove today's logs
                    this.removeIgnoringErrors(path.resolve(tempDir, dirEntry.name));
                }
            }
        }
    }

    private getOsTempDir() {
        return OsUtils.tempDir;
    }

    private removeIgnoringErrors(entryName: string) {
        log.debug(`DEL ${entryName}`);
        try {
            Deno.removeSync(entryName, { recursive: true });
        } catch (error) {
            log.debug(`Error ${error} - Ignoring ${entryName}`);
        }
    }

    readonly oneLineExample = "  clean --cache(optional) --backup(optional) --temp(optional) --logs(optional)"
}
