import { parse } from "https://deno.land/std/flags/mod.ts";

import Loader from './lib/loader.ts';
import Config from './lib/config.ts';
import { parseArgs } from "./lib/parseArgs.ts";

console.log("levain v0.0.1");
console.log("");

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
console.log("args", JSON.stringify(myArgs));

// Context
const config = new Config(myArgs);
//

// TODO: No parameters? Show Help
if (myArgs._.length == 0) {
    console.log("");
    console.log("Nothing to do. Do you want some help?");
    Deno.exit(1);
}

console.log("");
console.log("==================================");
// First parameter is the command
let cmd:string = myArgs._.shift()!;
const loader = new Loader(config);
loader.command(cmd, myArgs._);

/////////////////////////////////////////////////////////////////////////////////
