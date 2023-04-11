import * as log from "https://deno.land/std/log/mod.ts";
import {existsSync} from "https://deno.land/std/fs/mod.ts";

import Package from "../../lib/package/package.ts";
import Config from "../../lib/config.ts";
import {parseArgs} from "../../lib/parse_args.ts";

import Action from "../action.ts";

export default class CheckChainDirExists implements Action {
    constructor(private config: Config) {
    }

    async execute(pkg: Package | undefined, parameters: string[]) {
        log.debug(`CHECK CHAIN DIRS EXIST ${parameters.join(' ')}`)

        let args = parseArgs(parameters, {
            stringOnce: [
                "saveVar",
                "default",
            ]
        });

        this.verifyArgs(args); // throws

        const dirs: string[] = args._;
        const defaultValue = args.default

        let found = dirs
                .find(it => {
                    try {
                        log.debug(`checking dir ${it}`)
                        return existsSync(it)
                    } catch (error) {
                        log.debug(`ignoring error ${error}`)
                        return false
                    }
                })
            || defaultValue

        if (!found) {
            throw new Error(`dirs not found: ${dirs.join(', ')}`)
        }

        log.debug(`found ${found}`)
        this.config.setVar(args.saveVar, found);
    }

    verifyArgs(args: any) {
        if (!args._ || args._.length === 0) {
            throw "Inform the dirs that at least one should exist"
        }
    }
}
