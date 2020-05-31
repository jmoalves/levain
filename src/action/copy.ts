import { parse } from "https://deno.land/std/flags/mod.ts";
import { copySync } from "https://deno.land/std/fs/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import Action from "../lib/action.ts";
import Config from "../lib/config.ts";
import Package from '../lib/package.ts';

export default class Copy implements Action {
    constructor(private config:Config) {
    }

    execute(pkg:Package, parameters:string[]):void {
        let args = this.parseArgs(parameters);

        if (args._.length < 2) {
            throw "Action - copy - You should inform the source(s) and the destination";            
        }

        const dst = args._.pop();
        const src = args._;

        let copyToDir = false;        
        try {
            const fileInfo = Deno.statSync(dst);
            if (fileInfo.isDirectory) {
                copyToDir = true;
            }
        } catch (err) {
            throw err;
        }

        if (src.length > 1 && !copyToDir) {
            throw "Action - copy - Unable to copy multiple sources to a single file";
        }

        if (!args.verbose) {
            console.log("COPY", src, "=>", dst);
        }

        for (let item of src) {
            let realDst = dst;
            if (copyToDir) {
                realDst = path.resolve(dst, path.basename(item));
            }

            if (args.verbose) {
                console.log("COPY", item, "=>", realDst);
            }
            
            copySync(item, realDst, { overwrite: true });
        }
    }

    private parseArgs(args: string[]): any {
        return parse(args, {
            string: [
            ],
            boolean: [
                "verbose"
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
}