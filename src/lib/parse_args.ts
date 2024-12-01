import * as log from "jsr:@std/log";
import {parse} from "jsr:@std/flags";

class Opts {
    stringOnce?: string[];
    stringMany?: string[];
    boolean?: string[]
}

export function parseArgs(pArgs: string[], optsDef?: Opts): any {
    let opts: any = {
        stopEarly: true,
        unknown: (v: string) => {
            if (v.startsWith("-")) {
                throw new Error("ERROR: Unknown option " + v);
            }

            return true;
        }
    }

    if (optsDef?.stringOnce || optsDef?.stringMany) {
        opts.string = [];
        if (optsDef?.stringOnce) {
            optsDef.stringOnce.forEach((v) => {
                opts.string.push(v);
            })
        }

        // Handling BREAKING changes
        // https://github.com/denoland/deno_std/commit/6a95e2954dd58b68dbbb246cc362a8906a01ec04
        if (optsDef?.stringMany) {
            opts.collect = [];
            optsDef.stringMany.forEach((v) => {
                opts.string.push(v);
                opts.collect.push(v);
            })
        }
    }

    if (optsDef?.boolean) {
        opts.boolean = optsDef?.boolean;
    }

    let args = normalizeArgs(pArgs)

    checkStringOnce(args, optsDef?.stringOnce)
    
    let myArgs = parse(args, opts);

    if (optsDef?.stringMany) {
        optsDef.stringMany.forEach((key) => {
            if (typeof (myArgs[key]) == "string") {
                myArgs[key] = [myArgs[key]]
            }

            if (myArgs[key] && myArgs[key].length == 0) {
                delete myArgs[key]
            }
        })
    }

    return myArgs;
}

export function handleQuotes(args: string[]): string[] {
    if (!args || args.length < 2) {
        return args;
    }

    let newArgs: string[] = [];
    let previous:string[]|undefined = undefined;
    for (let element of args) {
        let count = countQuotes(element);
        if (count > 2) {
            throw `Too many quotes - ${args}`;
        }

        if (count == 0 && !previous) { // Regular arg
            addArg(newArgs, element);
            continue;
        }

        if (count == 0 && previous) { // element to join
            previous.push(element);
            continue;
        }

        if (count == 1 && !previous) { // Quote begin
            previous = [ element ];
            continue;
        }
        
        if (count == 1 && previous) { // Quote end
            addArg(newArgs, previous.join(" ") + " " + element);
            previous = undefined;
            continue;
        }

        if (count == 2 && !previous) { // Regular arg with quotes
            addArg(newArgs, element);
            continue;
        }

        // Oops... quote mismatch
        throw `Quote mismatch - ${args.join(" ")}`;
    }

    if (previous) {
        throw `Quote mismatch - ${args.join(" ")}`;
    }

    return newArgs;
}

function countQuotes(text: string): number {
    let count = 0;
    let index = 0;
    do {
        index = text.indexOf('"', index);
        if (index != -1) {
            count++;
            index++;
        }
    } while(index >= 0);

    return count;
}

function addArg(args: string[], text: string): void {
    args.push(text.replace(/"/g, ''));
}

function normalizeArgs(args: string[]): string[] {
    return args
        .filter(item => item)
        .map(item => item.trim())
        .filter(item => item.length > 0)
}

function checkStringOnce(args: string[], stringOnce: string[] | undefined) {
    if (!stringOnce || !args || args.length == 0) {
        return
    }

    let knownKeys = new Set()
    let stringOnceSet = new Set(stringOnce)

    args
        .filter(element => element?.startsWith('-'))
        .filter(element => stringOnceSet.has(element.replace(/^-{1,2}/, '')))
        .forEach(option => {
            if (knownKeys.has(option)) {
                throw new Error(`Use option ${option} only once`)
            }

            knownKeys.add(option)
        })
}

