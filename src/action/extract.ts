import { parse } from "https://deno.land/std/flags/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import Action from "../lib/action.ts";
import Config from "../lib/config.ts";
import Package from '../lib/package.ts';

export default class Extract implements Action {
    constructor(private config:Config) {
    }

    execute(pkg:Package, parameters:string[]):void {
        let args = this.parseArgs(parameters);
        
        if (args._.length != 2) {
            console.error("You must inform the file to extract and the destination directory");
            throw "Illegal arguments";
        }

        const src = path.resolve(pkg.pkgDir, args._[0]);
        const dst = path.resolve(pkg.baseDir, args._[1]);

        console.log("EXTRACT", src, "=>", dst);
    }

    private parseArgs(args: string[]): any {
        return parse(args, {
            string: [
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
}