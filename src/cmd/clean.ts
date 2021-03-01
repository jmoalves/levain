import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {existsSync} from "https://deno.land/std/fs/mod.ts";

import Config from "../lib/config.ts";
import {parseArgs} from "../lib/parse_args.ts";
import ConsoleAndFileLogger from "../lib/logger/console_and_file_logger.ts";
import OsUtils from "../lib/os/os_utils.ts";
import StringUtils from "../lib/utils/string_utils.ts";
import DateUtils from "../lib/utils/date_utils.ts";
import LevainVersion from "../levain_version.ts";

import Command from "./command.ts";

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
                "logs",
                "all",
                "deep"
            ]
        });

        const noArgs = !parameters.length
        if (noArgs) {
            myArgs.cache = false
            myArgs.backup = true
            myArgs.temp = true
            myArgs.logs = true
        } else if (myArgs.all) {
            myArgs.cache = true
            myArgs.backup = true
            myArgs.temp = true
            myArgs.logs = true
        }

        let shallow = !myArgs.deep

        //////////////////////////////////////////////////////////////////
        let total = 0

        if (myArgs.cache) {
            const cacheDir = this.config.levainCacheDir
            log.debug(`cleaning cacheDir ${cacheDir}`)
            let size = this.cleanDir(cacheDir)
            log.info(`CLEAN ${StringUtils.humanizeBytes(size)} - ${cacheDir}`)
            total += size
        }

        if (myArgs.backup) {
            const backupDir = this.config.levainBackupDir
            log.debug(`cleaning backupDir ${backupDir}`)

            let checkFile = undefined
            if (shallow) {
                checkFile = ((dirEntry:any) => {
                    // Keep today's backup
                    if (!dirEntry.name.match(`^bkp-${DateUtils.dateTag()}-`)) {
                        return true
                    }
        
                    return false
                })
            }

            let size = this.cleanDir(backupDir, checkFile)
            log.info(`CLEAN ${StringUtils.humanizeBytes(size)} - ${backupDir}`)
            total += size
        }

        if (myArgs.temp) {
            const tempDir = this.config.levainSafeTempDir
            log.debug(`cleaning tempDir ${tempDir}`)
            let size = this.cleanDir(tempDir)
            log.info(`CLEAN ${StringUtils.humanizeBytes(size)} - ${tempDir}`)
            total += size

            size = this.cleanOsTempDir(shallow)
            total += size
        }

        if (myArgs.logs) {
            log.debug(`cleaning logs`)
            let size = this.cleanLogs()
            total += size
        }

        log.info("=================")
        log.info(`CLEAN ${StringUtils.humanizeBytes(total)} - TOTAL`)
    }

    private cleanDir(entry: string, includeResolver?:((dirEntry:Deno.DirEntry) => boolean)): number {
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
            .filter((entry) => !includeResolver || includeResolver(entry))
            .map((entry) => this.cleanDir(path.resolve(entryPath, entry.name)))
            .reduce(
                ( dirsize, filesize ) => dirsize + filesize,
                0
            )

        try {
            Deno.removeSync(entryPath)
        } catch (error) {
            log.debug(`${entryPath} - Ignoring ${error}`)
        }

        // log.debug(`DEL-DIR  ${entryPath} - ${size}`)
        return size
    }

    private cleanOsTempDir(shallow: boolean): number {
        let tempDir = this.getOsTempDir();
        if (!tempDir) {
            return 0;
        }

        log.debug(`cleaning tempDir ${tempDir}`)
        let size = this.cleanDir(tempDir, (dirEntry:any) => {
            if (dirEntry.name.match("^levain-temp-")) {
                return true
            }

            if (dirEntry.isDirectory && dirEntry.name.match("^levain-")) {
                return true
            }

            return false
        })

        const levainReleasesDir = path.resolve(tempDir, 'levain')
        if (existsSync(levainReleasesDir)) {
            log.debug(`cleaning tempDir ${levainReleasesDir} - levain releases`)
            size += this.cleanDir(levainReleasesDir, (dirEntry:any) => {
                if (!shallow || !dirEntry.name.match(`^levain-${LevainVersion.levainVersion.versionNumber}$`)) {
                    return true
                }
    
                return false
            })    
        }

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
