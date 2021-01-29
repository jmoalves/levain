import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';
import {parseArgs} from "../lib/parse_args.ts";

import Action from "./action.ts";

export default class Inspect implements Action {
    constructor(private config: Config) {
    }

    async execute(pkg: Package|undefined, parameters: string[]) {
        let args = parseArgs(parameters, {
            stringMany: [
                "regExp",
                "saveVar"
            ]
        });

        this.verifyArgs(args); // throws

        let src = path.resolve(Deno.cwd(), args._[0]);

        log.info(`INSPECT ${src}`);
        let data = Deno.readTextFileSync(src);
        for (let index in args.regExp) {
            let regexp = args.regExp[index];
            let varName = args.saveVar[index];

            let pattern = regexp.replace(/^\/(.+)\/([a-z]?)/, "$1");
            let flags = regexp.replace(/^\/(.+)\/([a-z]?)/, "$2");

            log.debug(`- INSPECT[rxp] /${pattern}/${flags} => ${varName}`);
            let matchArray = data.match(new RegExp(pattern, flags));

            if (!matchArray) {
                throw new Error(`${regexp} not found at ${src}`)
            }

            // FIXME: Check if regExp has match group or not...
            let value = matchArray[1] || matchArray[0];
            log.debug(`- INSPECT[rxp] /${pattern}/${flags} = ${value}`);
            this.config.setVar(varName, value);
        }
    }

    private verifyArgs(args: any): void {
        if (!args.regExp || args.regExp.length == 0) {
            throw "What do you need to search?"
        }

        if (!args.saveVar || args.saveVar.length == 0) {
            throw "Where should we put the result?"
        }

        if (args.regExp.length != args.saveVar.length) {
            throw "There is a mismatch between --regExp and --saveVar"
        }

        if (!args._ || args._.length != 1) {
            throw "Inform the source file"
        }

        for (let x in args.regExp) {
            if (args.regExp[x].search(/^\/(.+)\/([a-z]?)/) == -1) {
                throw "You must use regExps - " + args.regExp[x];
            }
        }
    }
}
