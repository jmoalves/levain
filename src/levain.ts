import * as log from "https://deno.land/std/log/mod.ts";

import Logger from './lib/log.ts'
import Loader from './lib/loader.ts';
import Config from './lib/config.ts';
import { parseArgs } from "./lib/parseArgs.ts";
import { askUsername, askPassword } from "./lib/credentials.ts";

export async function levainCLI(): Promise<void> {
    await Logger.setup();

    log.info(`  deno v${Deno.version.deno}`);
    log.info(`levain v0.1.2`);

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
    Logger.setConfig(config);
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
    let cmd:string = myArgs._.shift()!;
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
