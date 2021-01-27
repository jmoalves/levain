import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {emptyDirSync} from "https://deno.land/std/fs/mod.ts";

import Config from "../lib/config.ts";
import {parseArgs} from "../lib/parse_args.ts";
import ConsoleAndFileLogger from "../lib/logger/console_and_file_logger.ts";
import OsUtils from "../lib/os/os_utils.ts";

import Command from "./command.ts";
import StringUtils from "../lib/utils/string_utils.ts";

export default class CleanCommand implements Command {

    constructor(
        private config: Config,
    ) {
    }

    execute(parameters: string[]): void {
        const myArgs = parseArgs(parameters, {
            boolean: [
                "cache",
                "backup",
                "temp",
                "logs"
            ]
        });

        let total = 0

        const noArgs = !parameters.length
        if (myArgs.cache || noArgs) {
            const cacheDir = this.config.levainCacheDir
            log.debug(`cleaning cacheDir ${cacheDir}`)
            let size = this.cleanDir(cacheDir)
            log.info(`CLEAN ${StringUtils.humanizeBytes(size)} - ${cacheDir}`)
            total += size
        }

        if (myArgs.backup || noArgs) {
            const backupDir = this.config.levainBackupDir
            log.debug(`cleaning backupDir ${backupDir}`)
            let size = this.cleanDir(backupDir)
            log.info(`CLEAN ${StringUtils.humanizeBytes(size)} - ${backupDir}`)
            total += size
        }

        if (myArgs.temp || noArgs) {
            const tempDir = this.config.levainSafeTempDir
            log.debug(`cleaning tempDir ${tempDir}`)
            let size = this.cleanDir(tempDir)
            log.info(`CLEAN ${StringUtils.humanizeBytes(size)} - ${tempDir}`)
            total += size

            size = this.cleanOsTempDir()
            total += size
        }

        if (myArgs.logs || noArgs) {
            log.debug(`cleaning logs`)
            let size = this.cleanLogs()
            total += size
        }

        log.info("=================")
        log.info(`CLEAN ${StringUtils.humanizeBytes(total)} - TOTAL`)
    }

    private cleanDir(entry: string, include?:((dirEntry:Deno.DirEntry) => boolean)): number {
        let entryPath = path.resolve(entry)
        // log.debug(`WALK ${entryPath}`)

        let entryInfo = Deno.statSync(entryPath)
        if (!entryInfo.isDirectory) {
            try {
                Deno.removeSync(entryPath)
            } catch (error) {
                log.debug(`Error ${error} - Ignoring ${entryPath}`)
            }
            // log.debug(`DEL-FILE ${entryPath} - ${entryInfo.size}`)
            return entryInfo.size
        }

        let size = Array.from(Deno.readDirSync(entryPath))
            .filter((entry) => !include || include(entry))
            .map((entry) => this.cleanDir(path.resolve(entryPath, entry.name)))
            .reduce(
                ( dirsize, filesize ) => dirsize + filesize,
                0
            )

        // log.debug(`DEL-DIR  ${entryPath} - ${size}`)
        return size
    }

    private cleanOsTempDir(): number {
        let tempDir = this.getOsTempDir();
        if (!tempDir) {
            return 0;
        }

        log.debug(`cleaning tempDir ${tempDir}`)
        let size = this.cleanDir(tempDir, (dirEntry) => {
            if (dirEntry.name.match("^levain-temp-.*")) {
                return true
            }

            if (dirEntry.isDirectory && dirEntry.name.match("^levain-.*")) {
                return true
            }

            if (dirEntry.name.match("^levain$")) {
                return true
            }

            return false
        })

        log.info(`CLEAN ${StringUtils.humanizeBytes(size)} - ${tempDir}`)
        return size
    }

    private cleanLogs(): number {
        let tempDir = this.getOsTempDir();
        if (!tempDir) {
            return 0;
        }

        log.debug(`cleaning logs at tempDir ${tempDir}`)
        let size = this.cleanDir(tempDir, (dirEntry) => {
            if (dirEntry.isFile && dirEntry.name.match("^levain-.*\.log")) {
                let dateTag = ConsoleAndFileLogger.logDateTag();
                if (!dirEntry.name.match(`^levain-${dateTag}-.*`)) { // Do not remove today's logs
                    return true
                }
            }

            return false
        })

        log.info(`CLEAN ${StringUtils.humanizeBytes(size)} - logs at ${tempDir}`)
        return size
    }

    private getOsTempDir() {
        return OsUtils.tempDir;
    }

    readonly oneLineExample = "  clean --cache(optional) --backup(optional) --temp(optional) --logs(optional)"
}
