import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import ConsoleAndFileLogger from './src/lib/logger/console_and_file_logger.ts'
import {parseArgs} from "./src/lib/parse_args.ts";
import {Timer} from "./src/lib/timer.ts";
import CliUtil from "./src/lib/cli_util.ts";

import LevainCli from "./src/levain_cli.ts";

export default class Levain {
    static get levainRootFile(): string {
        // https://stackoverflow.com/questions/61829367/node-js-dirname-filename-equivalent-in-deno
        return path.fromFileUrl(import.meta.url)
    }

    static get levainRootDir(): string {
        // https://stackoverflow.com/questions/61829367/node-js-dirname-filename-equivalent-in-deno
        return path.dirname(Levain.levainRootFile)
    }


    logFiles: string[] = [];
    timer = new Timer()
    logger: ConsoleAndFileLogger | undefined;

    myArgs: any;
    error = false;

    async runLevinWithLog(cmdArgs: string[] = []): Promise<ConsoleAndFileLogger | undefined> {
        try {
            this.myArgs = parseArgs(cmdArgs, {
                stringOnce: [
                    "email-domain",
                    "levainCache",
                    "shellPath"
                ],
                stringMany: [
                    "levainHome",
                    "addRepo",
                    "tempRepo",
                    "add-log",
                    "add-log-dir",
                ],
                boolean: [
                    "askPassword", // FIXME: Deprecated
                    "ask-login",
                    "ask-password",
                    "ask-email",
                    "ask-fullname",
                    "wait-to-begin",
                    "wait-after-end",
                    "skip-levain-updates",
                    "levain-upgrade"
                ]
            });

            await this.prepareLogs(this.myArgs);

            log.info("");
            log.info(`levain ${cmdArgs.join(' ')}`)
            log.info("==================================");
            log.info("");
            await new LevainCli().execute(this.myArgs);

        } catch (err) {

            log.error("");
            log.error("********************************************************************************");
            log.error("");
            log.error(err);
            log.error("");
            log.error("********************************************************************************");
            log.error("");

            this.error = true;
        } finally {

            log.info("");
            this.logger?.showLogFiles(this.logFiles);

            log.info("");
            log.info(`Levain ran in ${this.timer.humanize()}`)
            this.logger?.flush()

            if (this.error) {
                log.error('execution FAILED')
            } else {
                log.info('execution SUCCESS')
            }

            if (this.error || (this.myArgs && this.myArgs["wait-after-end"])) {
                console.log("");
                prompt("Hit ENTER to finish");
            }
        }

        return this.logger
    }

    async prepareLogs(myArgs: any): Promise<ConsoleAndFileLogger> {
        this.logFiles = this.getLogFiles(myArgs['add-log'], myArgs['add-log-dir'])
        this.logger = await ConsoleAndFileLogger.setup(this.logFiles);
        log.info('')
        log.info('Hi!')
        this.logger.showLogFiles(this.logFiles);
        if (myArgs['add-log'] || myArgs['add-log-dir']) {
            CliUtil.askToContinue()
        }
        return this.logger
    }

    getLogFiles(
        extraLogFiles: string[] = [],
        extraLogDirs: string[] = [],
    ): string[] {
        let logFiles = []
        logFiles.push(ConsoleAndFileLogger.getLogFileInHomeFolder())
        logFiles.push(ConsoleAndFileLogger.getLogFileInTempFolder())
        logFiles = logFiles.concat(extraLogFiles)
        log.debug(`extraLogFiles [${extraLogFiles}] ${logFiles.length}`)
        extraLogDirs.forEach(extraDir => {
            logFiles.push(ConsoleAndFileLogger.getLogFileInExtraDir(extraDir))
        })
        log.debug(`extraLogDirs ${extraLogDirs} ${logFiles.length}`)
        log.debug(`logFiles.length ${logFiles.length}`)
        return logFiles
    }

}

// https://deno.land/manual/tools/script_installer
if (import.meta.main) {
    await new Levain().runLevinWithLog(Deno.args);
    console.log("Bye!");
}
