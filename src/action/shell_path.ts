import * as log from "https://deno.land/std/log/mod.ts";

import Action from "./action.ts";
import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';

export default class ShellPath implements Action {
    constructor(private config: Config) {
    }

    async execute(pkg: Package, parameters: string[]): Promise<void> {
        if (parameters.length != 1) {
            throw `You must inform the shell path ${parameters}`
        }

        let shellPath = parameters[0]
        log.info(`SHELL-PATH ${shellPath}`)

        this.config.shellPath = shellPath
    }
}
