import Command from "./command.ts";
import Config from "../lib/config.ts";
import {parseArgs} from "../lib/parse_args.ts";
import * as log from "https://deno.land/std/log/mod.ts";
import {emptyDirSync} from "https://deno.land/std/fs/mod.ts";

export default class CleanCommand implements Command {

    constructor(
        private config: Config,
    ) {
    }

    execute(parameters: string[]): void {
        log.info('CLEAN')

        const myArgs = parseArgs(parameters, {
            boolean: [
                "cache",
            ]
        });

        const cache = this.config.levainCacheDir;
        emptyDirSync(cache)
    }

}