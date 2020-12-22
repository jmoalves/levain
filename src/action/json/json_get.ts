import * as log from "https://deno.land/std/log/mod.ts";

import Action from "../action.ts";
import Package from "../../lib/package/package.ts";
import Config from "../../lib/config.ts";
import { parseArgs } from "../../lib/parse_args.ts";

export default class JsonGet implements Action {
    constructor(config: Config) {
    }

    async execute(pkg: Package, parameters: string[]) {
        log.info(`JSON-GET ${parameters.join(' ')}`);
        
        let myArgs = parseArgs(parameters, {
            stringOnce: [
                "setVar",
                "default"
            ],
            stringMany: [
            ],
            boolean: [
            ]
        });
    }
}
