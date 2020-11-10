import * as log from "https://deno.land/std/log/mod.ts";

import Logger from './lib/log.ts'
import Loader from './lib/loader.ts';
import Config from './lib/config.ts';
import { parseArgs } from "./lib/parseArgs.ts";

await Logger.setup();

log.info(`  deno v${Deno.version.deno}`);
log.info(`levain v0.0.4`);
log.info("");

const myArgs = parseArgs(Deno.args, {
    stringOnce: [
        "levainHome"
    ],
    stringMany: [
        "addRepo"
    ],
    boolean: [
    ]
});
log.debug("args " + JSON.stringify(myArgs));

// Context
const config = new Config(myArgs);
//

// TODO: No parameters? Show Help
if (myArgs._.length == 0) {
    log.error("");
    log.error("Nothing to do. Do you want some help?");
    Deno.exit(1);
}

log.info("");
log.info("==================================");

// First parameter is the command
let cmd:string = myArgs._.shift()!;
const loader = new Loader(config);
await loader.command(cmd, myArgs._);

/////////////////////////////////////////////////////////////////////////////////
log.info("");
log.info("==================================");
log.info("Levain fermentee!");
log.info("");
