import * as log from "https://deno.land/std/log/mod.ts";

import Action from "./action.ts";
import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';

export default class Noop implements Action {
    constructor(private config: Config, private actionName: string) {
    }

    execute(pkg: Package, parameters: string[]): void {
        log.info(`NOOP[${this.actionName}] ${parameters}`);
    }
}