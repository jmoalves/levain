import Loader from './lib/loader.ts';
import Config from './lib/config.ts';

const { args, exit } = Deno;

console.log("levain v0.0.1");
console.log("");

// args clone
const myArgs:string[] = [];
for (let arg of args) {
    myArgs.push(arg);    
}

// TODO: Handle general options
if (myArgs.length == 0) {
    // TODO: Show Help
    exit(1);
}

console.log("");

// First parameter is the command
let first = myArgs.shift();
if (first && first.startsWith("-")) { // TODO: Improve this!
    console.error(`ERROR: Invalid levain option '${first}'`);
    exit(1);
}

let cmd:string = first!;

const config = new Config();
const loader = new Loader(config)
loader.execute(cmd, myArgs);

