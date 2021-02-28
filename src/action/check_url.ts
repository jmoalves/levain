import * as log from "https://deno.land/std/log/mod.ts";

import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';
import {parseArgs} from "../lib/parse_args.ts";

import Action from "./action.ts";

export default class CheckUrl implements Action {
    constructor(private config: Config) {
    }

    // deno-lint-ignore require-await
    async execute(pkg: Package|undefined, parameters: string[]): Promise<void> {
        const args = parseArgs(parameters, {
        })

        if (!args._ || args._.length < 1) {
            throw new Error(`You must inform the URL to check`)
        }
        
        const url = args._[0]
        log.info(`CHECK-URL ${url}`)

        try {
            const response = await fetch(url)
            log.debug(`- ${response?.status} - ${response?.statusText} - ${url}`)

            if (response?.status == 200) {
                return
            }

            throw new Error(`Invalid status - ${response?.status} for ${url}`)
        } catch (error) {
            throw new Error(`Error checking ${url} - ${error}`)
        }
    }
}
