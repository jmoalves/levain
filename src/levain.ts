import * as log from "https://deno.land/std/log/mod.ts";

import ConsoleAndFileLogger from './lib/logger/console_and_file_logger.ts'
import Loader from './lib/loader.ts';
import Config from './lib/config.ts';
import {parseArgs} from "./lib/parseArgs.ts";
import {askPassword, askUsername} from "./lib/credentials.ts";
import {Timer} from "./lib/timer.ts";

export async function levainCLI(myArgs: any): Promise<void> {
    log.info(`  deno v${Deno.version.deno}`);
    log.info(`levain v0.3.9`);

    log.debug("args " + JSON.stringify(myArgs));

    // Context
    const config = new Config(myArgs);
    ConsoleAndFileLogger.setConfig(config);
    //

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
        log.info("");
        log.info("Commands available:")
        log.info("  list")
        log.info("  install")
        log.info("  shell")
        return
    }

    if (myArgs.askPassword) {
        askUsername(config);
        await askPassword(config);
    }

    // First parameter is the command
    let cmd: string = myArgs._.shift()!;
    const loader = new Loader(config);
    await loader.command(cmd, myArgs._);

    /////////////////////////////////////////////////////////////////////////////////
    log.info("==================================");
    log.info("");
}

export async function runLevinWithLog() {
    let logFiles: string[] = [];
    let myArgs;
    const timer = new Timer()

    let error = false;
    try {
        myArgs = parseArgs(Deno.args, {
            stringOnce: [
                "levainHome"
            ],
            stringMany: [
                "addRepo"
            ],
            boolean: [
                "askPassword",
                "wait-to-begin",
                "wait-after-end",
                "skip-local-log"
            ]
        });

        logFiles = await ConsoleAndFileLogger.setup(myArgs["skip-local-log"]);

        await levainCLI(myArgs);

    } catch (err) {
        log.error(err);
        error = true;
    } finally {
        log.info("");
        logFiles.forEach(logFile => {
            log.info(`logFile -> ${logFile}`);
        })

        log.info("");
        log.info(`Levain ran in ${timer.measure()}ms`)

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
