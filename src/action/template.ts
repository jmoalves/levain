import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import Action from "../lib/action.ts";
import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';
import { parseArgs } from "../lib/parseArgs.ts";

export default class Template implements Action {
    constructor(private config:Config) {
    }

    async execute(pkg:Package, parameters:string[]) {
        let args = parseArgs(parameters, {
            stringMany: [
                "replace",
                "with"
            ]
        });

        this.verifyArgs(args); // throws

        let src = path.resolve(pkg.pkgDir, args._[0]);
        let dst = path.resolve(pkg.baseDir, args._[1]);

        log.info(`TEMPLATE ${src} => ${dst}`);
        let data = Deno.readTextFileSync(src);
        for (let x in args.replace) {
            if (args.replace[x].search(/^\/(.+)\/([a-z]?)/) != -1) {
                // É regexp
                let regexp = args.replace[x].replace(/^\/(.+)\/([a-z]?)/, "$1");
                let flags = args.replace[x].replace(/^\/(.+)\/([a-z]?)/, "$2");

                log.debug(`- REPLACE[rxp] /${regexp}/${flags} => ${args.with[x]}`);
                data = data.replace(new RegExp(regexp, flags), args.with[x]);
            } else {
                log.debug(`- REPLACE[str] ${args.replace[x]} => ${args.with[x]}`);
                data = data.replace(args.replace[x], args.with[x]);
            }
        }

        try {
            const fileInfo = Deno.statSync(dst);
            if (fileInfo.isDirectory) {
                dst = path.resolve(dst, path.basename(src));
            }    
        } catch (err) {
            if (err.name != "NotFound") {
                throw err;
            }
        }

        log.debug(`- WRITE ${dst}`);
        await Deno.writeTextFileSync(dst, data);
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