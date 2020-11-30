import * as log from "https://deno.land/std/log/mod.ts";
import {parse} from "https://deno.land/std/flags/mod.ts";

class Opts {
    stringOnce?: string[];
    stringMany?: string[];
    boolean?: string[]
}

export function parseArgs(args: string[], optsDef?: Opts): any {
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
        if (optsDef?.stringMany) {
            optsDef.stringMany.forEach((v) => {
                opts.string.push(v);
            })
        }
    }

    if (optsDef?.boolean) {
        opts.boolean = optsDef?.boolean;
    }

    let myArgs = parse(args, opts);

    if (optsDef?.stringOnce) {
        optsDef.stringOnce.forEach((key) => {
            if (myArgs[key]) {
                if (typeof (myArgs[key]) != "string") {
                    throw new Error(`Use option ${key} only once`);
                }
            }
        })
    }

    if (optsDef?.stringMany) {
        optsDef.stringMany.forEach((key) => {
            if (typeof (myArgs[key]) == "string") {
                myArgs[key] = [myArgs[key]];
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
    let previous:string|undefined = undefined;
    for (let element of args) {
        let count = countQuotes(element);
        if (count == 0 || count % 2 == 0) {
            if (previous) {
                addArg(newArgs, previous);
                previous = undefined;
            }
            addArg(newArgs, element);
            continue;
        }

        if (previous == undefined) {
            previous = element;
            continue;
        }

        addArg(newArgs, previous + " " + element);
        previous = undefined;
    }

    if (previous) {
        addArg(newArgs, previous);
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
