import { parse } from "https://deno.land/std/flags/mod.ts";

import Loader from './lib/loader.ts';
import Config from './lib/config.ts';

console.log("levain v0.0.1");
console.log("");

const myArgs = parseArgs();
console.log("args", JSON.stringify(myArgs));

// Context
const config = new Config(myArgs);
//


// TODO: No parameters? Show Help
if (myArgs._.length == 0) {
    Deno.exit(1);
}

console.log("");
console.log("==================================");
// First parameter is the command
let cmd:string = myArgs._.shift()!;
const loader = new Loader(config);
loader.command(cmd, myArgs._);

/////////////////////////////////////////////////////////////////////////////////
function parseArgs(): any {
    const { args } = Deno;

    return parse(args, {
        string: [
            "levainHome"
        ],
        boolean: [
        ],
        stopEarly: true,
        unknown: (v) => { 
            if (v.startsWith("-")) {
                console.log("ERROR: Unknown option", v);
                return false;
            } else {
                return true;
            }
        }
    });    
}