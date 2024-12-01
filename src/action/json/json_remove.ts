import * as log from "jsr:@std/log";

import Action from "../action.ts";
import Package from "../../lib/package/package.ts";
import Config from "../../lib/config.ts";
import {parseArgs} from "../../lib/parse_args.ts";

export default class JsonSet implements Action {
    constructor(config: Config) {
    }

    async execute(pkg: Package, parameters: string[]) {
        log.debug(`JSON-REMOVE ${parameters.join(' ')}`);

        let myArgs = parseArgs(parameters, {
            stringOnce: [],
            stringMany: [],
            boolean: []
        });

        throw 'not implemented yet'
    }
}
