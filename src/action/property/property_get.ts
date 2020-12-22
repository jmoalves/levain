import Action from "../action.ts";
import Package from "../../lib/package/package.ts";
import {parseArgs} from "../../lib/parse_args.ts";
import * as log from "https://deno.land/std/log/mod.ts";
import Config from "../../lib/config.ts";

export default class PropertyGetAction implements Action {
    constructor(
        config: Config
    ) {
    }

    async execute(pkg: Package, parameters: string[]) {
        log.info(`PROPERTY-GET ${parameters.join(' ')}`);

        let myArgs = parseArgs(parameters, {
            stringOnce: [
                "setVar",
                "default"
            ],
            stringMany: [],
            boolean: []
        });
    }
}