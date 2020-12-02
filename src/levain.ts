import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import ConsoleAndFileLogger from './lib/logger/console_and_file_logger.ts'
import Loader from './lib/loader.ts';
import Config from './lib/config.ts';
import {parseArgs} from "./lib/parse_args.ts";
import UserInfoUtil from "./lib/user_info/userinfo_util.ts";
import {Timer} from "./lib/timer.ts";

export async function levainCLI(myArgs: any = {}): Promise<void> {
    const __filename = path.fromFileUrl(import.meta.url);

    log.info(`levain vHEAD    (${__filename})`);
    log.info(`  deno v${Deno.version.deno}`);

    log.debug("args " + JSON.stringify(myArgs));

    if (myArgs["wait-to-begin"]) {
        console.log("");
        console.log("");
        let answer = prompt("Continue?", "Y");
        if (!answer || !["Y", "YES"].includes(answer.toUpperCase())) {
            log.info("");
            log.info("Ok, aborting...");
            Deno.exit(1);
        }
    }

    // Time to business!
    log.info("");
    log.info("==================================");
    log.info("");
    log.info(`CWD ${Deno.cwd()}`);

    if (myArgs?._?.length == 0) {
        showCliHelp()
        return
    }

    // Context
    const config = new Config(myArgs);
    ConsoleAndFileLogger.config = config;

    function getCmd() {
        return myArgs._.shift()!;
    }

    // First parameter is the command
    let cmd: string = getCmd();

    // Ask for user_info
    if (cmd === 'install') {
        await askUserInfo(config, myArgs);
    }

    const loader = new Loader(config);
    await loader.command(cmd, myArgs._);

    /////////////////////////////////////////////////////////////////////////////////
    log.info("==================================");
    log.info("");

    config.save();
}

async function askUserInfo(config: Config, myArgs: any) {
    // Some nasty tricks... Should we refactor this?
    let separatorEnd: (() => void) | undefined = () => {
    };
    let separatorBegin: (() => void) | undefined = () => {
        if (separatorEnd) console.log("");
        log.info("==================================");
        log.info("");
        if (separatorBegin) console.log("");

        separatorEnd = separatorBegin;
        separatorBegin = undefined;
    };
    //

    if (myArgs.askPassword) {
        (separatorBegin ? separatorBegin() : undefined);

        log.warning("--askPassword is Deprecated. Use --ask-login and --ask-password");
        myArgs["ask-login"] = true;
        myArgs["ask-password"] = true;
    }

    const userInfoUtil = new UserInfoUtil()

    if (myArgs["ask-login"]) {
        (separatorBegin ? separatorBegin() : undefined);

        userInfoUtil.askLogin(config);
    }

    if (myArgs["ask-password"]) {
        (separatorBegin ? separatorBegin() : undefined);

        await userInfoUtil.askPassword(config);
    }

    if (myArgs["ask-email"]) {
        (separatorBegin ? separatorBegin() : undefined);

        userInfoUtil.askEmail(config, myArgs["email-domain"]);
    }

    if (myArgs["ask-fullname"]) {
        (separatorBegin ? separatorBegin() : undefined);

        userInfoUtil.askFullName(config);
    }

    (separatorEnd ? separatorEnd() : undefined);
}

function showCliHelp() {
    log.info("");
    log.info("Commands available:")
    log.info("  list <optional search text>")
    log.info("  install <package name>")
    log.info("  shell <optional package name>")
}

export async function runLevinWithLog(cmdArgs: string[] = []): Promise<ConsoleAndFileLogger | undefined> {
    let logFiles: string[] = [];
    const timer = new Timer()
    let logger;

    let myArgs;
    let error = false;

    function getLogFiles(extraLogFiles: string[] = []): string[] {
        let logFiles = []
        logFiles.push(ConsoleAndFileLogger.getLogFileInHomeFolder())
        logFiles.push(ConsoleAndFileLogger.getLogFileInTempFolder())
        logFiles = logFiles.concat(extraLogFiles)
        console.debug(`extraLogFiles [${extraLogFiles}] ${logFiles.length}`)
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

        logFiles = getLogFiles(myArgs['add-log'])

        logger = await ConsoleAndFileLogger.setup(logFiles);
        logger.showLogFiles(logFiles);
        log.info("");

        await levainCLI(myArgs);

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
