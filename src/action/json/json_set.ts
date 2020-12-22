import * as log from "https://deno.land/std/log/mod.ts";

import Action from "../action.ts";
import Package from "../../lib/package/package.ts";
import Config from "../../lib/config.ts";
import { parseArgs } from "../../lib/parse_args.ts";
import JsonUtils from "../../lib/json_utils.ts";

export default class JsonSet implements Action {
    constructor(private config: Config) {
    }

    async execute(pkg: Package, parameters: string[]) {
        log.info(`JSON-SET ${parameters.join(' ')}`);

        let myArgs = parseArgs(parameters, {
            stringOnce: [
            ],
            stringMany: [
            ],
            boolean: [
                "ifNotExists"
            ]
        });

        if (myArgs?._?.length < 2) {
            throw Error('Missing parameters. jsonGet [--ifNotExists] property filename');
        }

        let property = myArgs._[0];
        if (property.startsWith("--")) {
            throw Error('Missing parameters. jsonGet [--ifNotExists] property filename');
        }

        let filename = myArgs._[1];
        if (filename.startsWith("--")) {
            throw Error('Missing parameters. jsonGet [--ifNotExists] property filename');
        }

        let json = JsonUtils.load(filename);
        let value = JsonUtils.get(json, property, myArgs.default);

        if (Array.isArray(value)) {
            throw Error(`Could not retrieve an entire array property - "${property}"`);
        }

        if (typeof value === 'object' && value !== null) {
            throw Error(`Could not retrieve an entire object property - "${property}"`);
        }
    }
}
