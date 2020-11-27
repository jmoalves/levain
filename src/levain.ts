import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import ConsoleAndFileLogger from './lib/logger/console_and_file_logger.ts'
import Loader from './lib/loader.ts';
import Config from './lib/config.ts';
import {parseArgs} from "./lib/parse_args.ts";
import {askEmail, askFullName, askLogin, askPassword} from "./lib/credentials.ts";
import {Timer} from "./lib/timer.ts";

export async function levainCLI(myArgs: any): Promise<void> {
    const __filename = path.fromFileUrl(import.meta.url);

    log.info(`levain vHEAD (${__filename})`);
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

    // TODO: No parameters? Show Help
    if (myArgs._.length == 0) {
        showCliHelp()
        return
    }

    // Context
    const config = new Config(myArgs);
    ConsoleAndFileLogger.setConfig(config);

    // Ask for credentials
    await askCredentials(config, myArgs);

    // First parameter is the command
    let cmd: string = myArgs._.shift()!;
    const loader = new Loader(config);
    await loader.command(cmd, myArgs._);

    /////////////////////////////////////////////////////////////////////////////////
    log.info("==================================");
    log.info("");
}

async function askCredentials(config: Config, myArgs: any) {
    if (myArgs.askPassword) {
        log.warning("--askPassword is Deprecated. Use --ask-login and --ask-password");
        myArgs["ask-login"] = true;
        myArgs["ask-password"] = true;
    }

    if (myArgs["ask-login"]) {
        askLogin(config);
    }

    if (myArgs["ask-password"]) {
        await askPassword(config);
    }

    if (myArgs["ask-email"]) {
        askEmail(config, myArgs["email-domain"]);
    }

    if (myArgs["ask-fullname"]) {
        askFullName(config);
    }
}

function showCliHelp() {
    log.info("");
    log.info("Commands available:")
    log.info("  list")
    log.info("  install")
    log.info("  shell")
}

export async function runLevinWithLog() {
    let logFiles: string[] = [];
    let myArgs;
    const timer = new Timer()

    let error = false;
    try {
        myArgs = parseArgs(Deno.args, {
            stringOnce: [
                "levainHome",
                "email-domain"
            ],
            stringMany: [
                "addRepo"
            ],
            boolean: [
                "askPassword", // FIXME: Deprecated
                "ask-login",
                "ask-password",
                "ask-email",
                "ask-fullname",
                "wait-to-begin",
                "wait-after-end",
                "skip-local-log"
            ]
        });

        logFiles = await ConsoleAndFileLogger.setup(myArgs["skip-local-log"]);
        ConsoleAndFileLogger.showLogFiles(logFiles);
        log.info("");

        await levainCLI(myArgs);

    } catch (err) {
        log.error(err);
        error = true;
    } finally {
        log.info("");
        ConsoleAndFileLogger.showLogFiles(logFiles);

        log.info("");
        log.info(`Levain ran in ${timer.humanize()}`)

        if (error || (myArgs && myArgs["wait-after-end"])) {
            console.log("");
            prompt("Hit ENTER to finish");
        }
    }
}

// https://deno.land/manual/tools/script_installer
if (import.meta.main) {
    await runLevinWithLog();
}
