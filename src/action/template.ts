import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import Action from "./action.ts";
import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';
import {parseArgs} from "../lib/parse_args.ts";

export default class Template implements Action {
    constructor(private config: Config) {
    }

    async execute(pkg: Package, parameters: string[]) {
        log.debug(`TEMPLATE ${parameters}`);

        let args = parseArgs(parameters, {
            stringMany: [
                "replace",
                "with"
            ],
            boolean: [
                "doubleBackslash"
            ]
        });

        this.verifyArgs(args); // throws

        let src = path.resolve(pkg.pkgDir, args._[0]);
        let dst = path.resolve(pkg.baseDir, args._[1]);

        log.info(`TEMPLATE ${src} => ${dst}`);
        let data = Deno.readTextFileSync(src);
        for (let x in args.replace) {
            let replacement = args.with[x];
            if (args.doubleBackslash) {
                log.debug(`- DOUBLE-BACK ${replacement}`);
                replacement = replacement
                    .replace(/\//g, '\\')
                    .replace(/\\([^\\])/g, '\\\\$1')
            }

            if (args.replace[x].search(/^\/(.+)\/([a-z]?)/) != -1) {
                // É regexp
                let regexp = args.replace[x].replace(/^\/(.+)\/([a-z]?)/, "$1");
                let flags = args.replace[x].replace(/^\/(.+)\/([a-z]?)/, "$2");

                log.debug(`- REPLACE[rxp] /${regexp}/${flags} => ${replacement}`);
                data = data.replace(new RegExp(regexp, flags), replacement);
            } else {
                log.debug(`- REPLACE[str] ${args.replace[x]} => ${replacement}`);
                data = data.replace(args.replace[x], replacement);
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
        log.debug(`- DATA`);
        log.debug(data);
        await Deno.writeTextFileSync(dst, data);
    }

    private verifyArgs(args: any): void {
        log.debug
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
            throw `Inform the template file and the destination file. ${args._}`
        }
    }
}