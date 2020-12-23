import * as log from "https://deno.land/std/log/mod.ts";

import Action from "./action.ts";
import Package from "../lib/package/package.ts";
import Config from "../lib/config.ts";
import {existsSync} from "https://deno.land/std/fs/mod.ts";
import {parseArgs} from "../lib/parse_args.ts";

export default class CheckChainDirExists implements Action {
    constructor(private config: Config) {
    }

    async execute(pkg: Package, parameters: string[]) {
        log.info(`CHECK CHAIN DIRS EXIST ${parameters.join(' ')}`)

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
                    log.debug(`checking dir ${it}`)
                    return existsSync(it)
                })
            || defaultValue

        if (!found) {
            throw new Error(`dirs not found: ${dirs.join(', ')}`)
        }

        this.config.setVar(args.saveVar, found);
    }

    verifyArgs(args: any) {
        if (!args._ || args._.length === 0) {
            throw "Inform the dirs that at least one should exist"
        }
    }
}
