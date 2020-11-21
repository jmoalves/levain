import * as log from "https://deno.land/std/log/mod.ts";

import ConsoleAndFileLogger from './lib/logger/consoleAndFileLogger.ts'
import Loader from './lib/loader.ts';
import Config from './lib/config.ts';
import {parseArgs} from "./lib/parseArgs.ts";
import {askPassword, askUsername} from "./lib/credentials.ts";

export async function levainCLI(): Promise<void> {
    await ConsoleAndFileLogger.setup();

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
            "askPassword"
        ]
    });
    log.debug("args " + JSON.stringify(myArgs));

    // Context
    const config = new Config(myArgs);
    ConsoleAndFileLogger.setConfig(config);
    //

    // Time to business!
    log.info("");
    log.info("==================================");

    // TODO: No parameters? Show Help
    if (myArgs._.length == 0) {
        log.error("");
        log.error("Nothing to do. Do you want some help?");
        Deno.exit(1);
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

// https://deno.land/manual/tools/script_installer
if (import.meta.main) {
    levainCLI();
}
