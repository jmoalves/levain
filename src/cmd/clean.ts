import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {existsSync} from "https://deno.land/std/fs/mod.ts";

import t from '../lib/i18n.ts'

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

        this.feedback.start(t("cmd.clean.startFeedback"))

        if (myArgs.cache) {
            const cacheDir = this.config.levainCacheDir

            let size = this.cleanDir(cacheDir)
            total += size
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

            let size = this.cleanDir(backupDir, checkFile)
            total += size

            size = this.cleanFailedSaves()
            total += size
        }

        if (myArgs.temp) {
            const tempDir = this.config.levainSafeTempDir

            let size = this.cleanDir(tempDir)
            total += size

            size = this.cleanOsTempDir(shallow)
            total += size
        }

        if (myArgs.logs) {
            log.debug(t("cmd.clean.logs"))
            let size = this.cleanLogs()
            total += size
        }

        log.debug("=================")
        log.debug(t("cmd.clean.cleaned", { amount: StringUtils.humanizeBytes(total) }))
        this.feedback.reset(t("cmd.clean.endFeedback", { amount: StringUtils.humanizeBytes(total) }))
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
                log.debug(t("cmd.clean.errorIgnoringEntryPath", { error: error, entryPath: entryPath }))
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
            log.debug(t("cmd.clean.entryPathIgnoringError", { error: error, entryPath: entryPath }))
        }

        // log.debug(`DEL-DIR  ${entryPath} - ${size}`)
        return size
    }

    private cleanFailedSaves(): number {
        let saveDir = this.config.levainHome
        if (!saveDir) {
            return 0;
        }

        let size = this.cleanDir(saveDir, (dirEntry:any) => {
            if (dirEntry.name.match(/^\.rename\./)) {
                // log.debug(`RM ${dirEntry.name}`)
                return true
            }

            if (dirEntry.name.match(/^\.deleted\./)) {
                // log.debug(`RM ${dirEntry.name}`)
                return true
            }

            return false
        })

        return size
    }

    private cleanOsTempDir(shallow: boolean): number {
        let tempDir = this.getOsTempDir();
        if (!tempDir) {
            return 0;
        }

        let size = this.cleanDir(tempDir, (dirEntry:any) => {
            if (dirEntry.name.match(`^levain-install-`)) {
                // using install.ps1
                return false
            }

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
                if (dirEntry.name.match(`^levain-${LevainVersion.levainVersion.versionNumber}$`)) {
                    // current version
                    return false
                }

                if (shallow) { 
                    return false
                }
    
                return true
            })
        }

        return size
    }

    private cleanLogs(): number {
        let tempDir = this.getOsTempDir();
        if (!tempDir) {
            return 0;
        }

        let size = this.cleanDir(tempDir, (dirEntry) => {
            if (dirEntry.isFile && dirEntry.name.match("^levain-.*\.log")) {
                let dateTag = ConsoleAndFileLogger.logDateTag();
                if (!dirEntry.name.match(`^levain-${dateTag}-.*`)) { // Do not remove today's logs
                    return true
                }
            }

            return false
        })

        return size
    }

    private getOsTempDir() {
        return OsUtils.tempDir;
    }

    readonly oneLineExample = t("cmd.clean.example")
}
