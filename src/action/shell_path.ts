import * as log from "jsr:@std/log";

import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';

import Action from "./action.ts";

export default class ShellPath implements Action {
    constructor(private config: Config) {
    }

    async execute(pkg: Package | undefined, parameters: string[]): Promise<void> {
        if (parameters.length != 1) {
            throw `You must inform the shell path ${parameters}`
        }

        let shellPath = parameters[0]
        log.debug(`SHELL-PATH ${shellPath}`)

        this.config.shellPath = shellPath
    }
}
