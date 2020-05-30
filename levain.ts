import Loader from './lib/loader.ts';
import Config from './lib/config.ts';

const { args, exit } = Deno;

console.log("levain v0.0.1");
console.log("");

// TODO: We should use a command line parser. But not Deno.flags.
// args clone
const myArgs:string[] = [];
let optionSpace:boolean = true;
for (let arg of args) {
    if (optionSpace && arg.startsWith("-")) {
        console.log("General option ignored", arg);
    } else {
        optionSpace = false;
        myArgs.push(arg);
    }
}

// TODO: Handle general options

// TODO: No parameters? Show Help
if (myArgs.length == 0) {
    exit(1);
}

// Context
const config = new Config();
//

console.log("");
console.log("==================================");
// First parameter is the command
let cmd:string = myArgs.shift()!;
const loader = new Loader(config);
loader.command(cmd, myArgs);
