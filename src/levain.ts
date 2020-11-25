import * as log from "https://deno.land/std/log/mod.ts";

import ConsoleAndFileLogger from './lib/logger/console_and_file_logger.ts'
import Loader from './lib/loader.ts';
import Config from './lib/config.ts';
import {parseArgs} from "./lib/parseArgs.ts";
import {askPassword, askUsername} from "./lib/credentials.ts";

export async function levainCLI(): Promise<void> {
    log.info(`  deno v${Deno.version.deno}`);
    log.info(`levain vHEAD`);

    const myArgs = parseArgs(Deno.args, {
        stringOnce: [
            "levainHome"
        ],
        stringMany: [
            "addRepo"
        ],
        boolean: [
            "askPassword",
            "wait-to-begin",
            "wait-after-end"
        ]
    });
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

    if (myArgs["wait-after-end"]) {
        console.log("");
        console.log("Levain fermentee!");
        prompt("Hit ENTER to finish");
    }
}

export async function runLevinWithLog() {
    let logFiles: string[] = [];

    try {
        logFiles = await ConsoleAndFileLogger.setup();
        await levainCLI();

    } catch (err) {
        log.error(err);
        console.log("");
        prompt("Hit ENTER to finish");
    } finally {
        log.info("");
        logFiles.forEach(logFile => {
            log.info(`logFile -> ${logFile}`);
        })
    }
}

// https://deno.land/manual/tools/script_installer
if (import.meta.main) {
    await runLevinWithLog();
}
