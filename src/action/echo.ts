import * as log from "jsr:@std/log";

import Package from "../lib/package/package.ts";
import Config from "../lib/config.ts";

import Action from "./action.ts";

export default class Echo implements Action {
    constructor(config: Config) {
    }

    async execute(pkg: Package | undefined, parameters: string[]) {
        log.debug(`ECHO ${parameters.join(' ')}`);
    }
}
