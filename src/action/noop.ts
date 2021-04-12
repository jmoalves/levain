import * as log from "https://deno.land/std/log/mod.ts";

import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';

import Action from "./action.ts";

export default class Noop implements Action {
    constructor(private config: Config, private actionName: string) {
    }

    async execute(pkg: Package | undefined, parameters: string[]): Promise<void> {
        log.info(`NOOP[${this.actionName}] ${parameters}`);
    }
}
