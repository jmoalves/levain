import * as path from "https://deno.land/std/path/mod.ts";

import Action from "../lib/action.ts";
import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';
import { parseArgs } from "../lib/parseArgs.ts";

export default class Template implements Action {
    constructor(private config:Config) {
    }

    execute(context: any, pkg:Package, parameters:string[]): void {
        let args = parseArgs(parameters, {
            stringMany: [
                "replace",
                "with"
            ]
        });

        this.verifyArgs(args); // throws

        let src = path.resolve(pkg.pkgDir, args._[0]);
        let dst = path.resolve(pkg.baseDir, args._[1]);

        console.log(`replace @${pkg.name}`, `src=${src}`, `dst=${dst}`);
        for (let x in args.replace) {
            console.log("REPLACE", args.replace[x], "=>", args.with[x]);
        }
    }

    private verifyArgs(args: any): void {
        if (!args.replace || args.replace.length == 0) {
            throw "What do you need to replace?"
        }

        if (!args.with || args.with.length == 0) {
            throw "What do you need to replace with?"
        }

        if (args.replace.length != args.with.length) {
            throw "There is a mismatch between --replace and --with"
        }

        if (!args._ || args._.length != 2) {
            throw "Inform the template file and the destination file"
        }
    }
}