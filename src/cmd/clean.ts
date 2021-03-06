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
import ConsoleFeedback from "../lib/utils/console_feedback.ts";

import Command from "./command.ts";

export default class CleanCommand implements Command {
    readonly feedback = new ConsoleFeedback();

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

            this.feedback.start(`# CLEAN ${cacheDir}`)
            let size = this.cleanDir(cacheDir)
            total += size
            this.feedback.reset(`# CLEAN ${cacheDir} - ${StringUtils.humanizeBytes(size)}`)
        }

        if (myArgs.backup) {
            const backupDir = this.config.levainBackupDir

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

            this.feedback.start(`# CLEAN ${backupDir}`)
            let size = this.cleanDir(backupDir, checkFile)
            total += size
            this.feedback.reset(`# CLEAN ${backupDir} - ${StringUtils.humanizeBytes(size)}`)

            size = this.cleanFailedSaves()
            total += size
        }

        if (myArgs.temp) {
            const tempDir = this.config.levainSafeTempDir

            this.feedback.start(`# CLEAN ${tempDir}`)
            let size = this.cleanDir(tempDir)
            total += size
            this.feedback.reset(`# CLEAN ${tempDir} - ${StringUtils.humanizeBytes(size)}`)

            size = this.cleanOsTempDir(shallow)
            total += size
        }

        if (myArgs.logs) {
            log.debug(`cleaning logs`)
            let size = this.cleanLogs()
            total += size
        }

        log.info("=================")
        log.info(`Cleaned ${StringUtils.humanizeBytes(total)}`)
    }

    private cleanDir(entry: string, includeResolver?:((dirEntry:Deno.DirEntry) => boolean)): number {
        let entryPath = path.resolve(entry)
        // log.debug(`WALK ${entryPath}`)

        this.feedback.show()

        let entryInfo = Deno.statSync(entryPath)
        if (!entryInfo.isDirectory) {
            try {
                Deno.removeSync(entryPath)
                // log.debug(`DEL-FILE ${entryPath} - ${entryInfo.size}`)
                return entryInfo.size
            } catch (error) {
                log.debug(`Error ${error} - Ignoring ${entryPath}`)
                return 0
            }
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

    private cleanFailedSaves(): number {
        let saveDir = this.config.levainHome
        if (!saveDir) {
            return 0;
        }

        this.feedback.start(`# CLEAN ${saveDir} - .rename.*`)

        let size = this.cleanDir(saveDir, (dirEntry:any) => {
            if (dirEntry.name.match(/^\.rename\./)) {
                // log.debug(`RM ${dirEntry.name}`)
                return true
            }

            return false
        })

        this.feedback.reset(`# CLEAN ${saveDir} - .rename.* - ${StringUtils.humanizeBytes(size)}`)
        return size
    }

    private cleanOsTempDir(shallow: boolean): number {
        let tempDir = this.getOsTempDir();
        if (!tempDir) {
            return 0;
        }

        this.feedback.start(`# CLEAN ${tempDir}`)
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
            size += this.cleanDir(levainReleasesDir, (dirEntry:any) => {
                if (!shallow || !dirEntry.name.match(`^levain-${LevainVersion.levainVersion.versionNumber}$`)) {
                    return true
                }
    
                return false
            })    
        }

        this.feedback.reset(`# CLEAN ${tempDir} - ${StringUtils.humanizeBytes(size)}`)
        return size
    }

    private cleanLogs(): number {
        let tempDir = this.getOsTempDir();
        if (!tempDir) {
            return 0;
        }

        this.feedback.start(`# CLEAN logs at ${tempDir}`)
        let size = this.cleanDir(tempDir, (dirEntry) => {
            if (dirEntry.isFile && dirEntry.name.match("^levain-.*\.log")) {
                let dateTag = ConsoleAndFileLogger.logDateTag();
                if (!dirEntry.name.match(`^levain-${dateTag}-.*`)) { // Do not remove today's logs
                    return true
                }
            }

            return false
        })

        this.feedback.reset(`# CLEAN logs at ${tempDir} - ${StringUtils.humanizeBytes(size)}`)
        return size
    }

    private getOsTempDir() {
        return OsUtils.tempDir;
    }

    readonly oneLineExample = "  clean --cache(optional) --backup(optional) --temp(optional) --logs(optional)"
}
