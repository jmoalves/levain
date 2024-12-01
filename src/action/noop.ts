import * as log from "jsr:@std/log";

import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';

import Action from "./action.ts";

export default class Noop implements Action {
    constructor(private config: Config, private actionName: string) {
    }

    async execute(pkg: Package | undefined, parameters: string[]): Promise<void> {
        log.debug(`NOOP[${this.actionName}] ${parameters}`);
    }
}
