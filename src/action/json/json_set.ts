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

        if (myArgs?._?.length < 3) {
            throw Error('Missing parameters. jsonSet [--ifNotExists] property value filename');
        }

        let property = myArgs._[0];
        if (property.startsWith("--")) {
            throw Error('Missing parameters. jsonSet [--ifNotExists] property value filename');
        }

        let value = myArgs._[1];
        if (value.startsWith("--")) {
            throw Error('Missing parameters. jsonSet [--ifNotExists] property value filename');
        }

        let filename = myArgs._[2];
        if (filename.startsWith("--")) {
            throw Error('Missing parameters. jsonSet [--ifNotExists] property value filename');
        }

        let json = JsonUtils.load(filename);
        let changed = JsonUtils.set(json, property, value, myArgs.ifNotExists);

        log.debug(`- json: ${JSON.stringify(json)}`);
        if (changed) {
            JsonUtils.save(filename, json);
            log.info(`JSON-SET ${property} = ${value} at ${filename}`);
        } else {
            log.info(`JSON-SET ${property} unchanged at ${filename}`);
        }
    }
}
