import * as log from "https://deno.land/std/log/mod.ts";

import Package from "../lib/package/package.ts";
import Config from "../lib/config.ts";

import Action from "./action.ts";

export default class Echo implements Action {
    constructor(config: Config) {
    }

    async execute(pkg: Package|undefined, parameters: string[]) {
        log.info(`ECHO ${parameters.join(' ')}`);
    }
}
