import * as log from "https://deno.land/std/log/mod.ts";
import {existsSync} from "https://deno.land/std/fs/mod.ts";

import Action from "../action.ts";
import Package from "../../lib/package/package.ts";
import Config from "../../lib/config.ts";
import {parseArgs} from "../../lib/parse_args.ts";
import JsonUtils from "../../lib/json_utils.ts";

export default class JsonSet implements Action {
    constructor(private config: Config) {
    }

    async execute(pkg: Package, parameters: string[]) {
        log.info(`JSON-SET ${parameters.join(' ')}`);

        let myArgs = parseArgs(parameters, {
            stringOnce: [],
            stringMany: [],
            boolean: [
                "ifNotExists"
            ]
        });

        if (myArgs?._?.length < 3) {
            throw Error('Missing parameters. jsonSet [--ifNotExists] filename property value');
        }

        let filename = myArgs._[0];
        if (filename.startsWith("--")) {
            throw Error('Missing parameters. jsonSet [--ifNotExists] filename property value');
        }

        let property = myArgs._[1];
        if (property.startsWith("--")) {
            throw Error('Missing parameters. jsonSet [--ifNotExists] filename property value');
        }

        let value = myArgs._[2];
        if (value.startsWith("--")) {
            throw Error('Missing parameters. jsonSet [--ifNotExists] filename property value');
        }

        let json = {}
        if (existsSync(filename)) {
            json = JsonUtils.load(filename) || {}
        }
        const changed = JsonUtils.set(json, property, value, myArgs.ifNotExists);

        log.debug(`- json: ${JSON.stringify(json)}`);
        if (changed) {
            JsonUtils.save(filename, json);
            log.debug(`JSON-SET ${property} = ${value} at ${filename}`);
        } else {
            log.debug(`JSON-SET ${property} unchanged at ${filename}`);
        }
    }
}
