import * as log from "https://deno.land/std/log/mod.ts";

import ConsoleAndFileLogger from './lib/logger/console_and_file_logger.ts'
import {parseArgs} from "./lib/parse_args.ts";
import {Timer} from "./lib/timer.ts";
import LevainCli from "./levain_cli.ts";
import CliUtil from "./lib/cli_util.ts";

export async function runLevinWithLog(cmdArgs: string[] = []): Promise<ConsoleAndFileLogger | undefined> {
    let logFiles: string[] = [];
    const timer = new Timer()
    let logger;

    let myArgs;
    let error = false;

    function getLogFiles(
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

    try {
        myArgs = parseArgs(cmdArgs, {
            stringOnce: [
                "levainHome",
                "email-domain"
            ],
            stringMany: [
                "addRepo",
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
            ]
        });

        logFiles = getLogFiles(myArgs['add-log'], myArgs['add-log-dir'])

        logger = await ConsoleAndFileLogger.setup(logFiles);
        logger.showLogFiles(logFiles);
        CliUtil.askToContinue()

        log.info("");

        await new LevainCli().execute(myArgs);

    } catch (err) {

        log.error("");
        log.error("********************************************************************************");
        log.error("");
        log.error(err);
        log.error("");
        log.error("********************************************************************************");
        log.error("");

        error = true;
    } finally {

        log.info("");
        logger?.showLogFiles(logFiles);

        log.info("");
        log.info(`Levain ran in ${timer.humanize()}`)
        logger?.flush()

        if (error) {
            log.error('execution FAILED')
        } else {
            log.info('execution SUCCESS')
        }

        if (error || (myArgs && myArgs["wait-after-end"])) {
            console.log("");
            prompt("Hit ENTER to finish");
        }
    }
    return logger
}

// https://deno.land/manual/tools/script_installer
if (import.meta.main) {
    await runLevinWithLog(Deno.args);
}
