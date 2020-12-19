import Command from "./command.ts";
import Config from "../lib/config.ts";
import {parseArgs} from "../lib/parse_args.ts";
import * as log from "https://deno.land/std/log/mod.ts";
import {emptyDirSync} from "https://deno.land/std/fs/mod.ts";

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
            log.info(`cleaning backupDir ${tempDir}`)
            emptyDirSync(tempDir)
        }
    }
}
