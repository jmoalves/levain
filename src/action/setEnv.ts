import * as log from "https://deno.land/std/log/mod.ts";

import Action from "./action.ts";
import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';

export default class SetEnv implements Action {
    constructor(private config: Config) {
    }

    execute(pkg: Package, parameters: string[]): void {
        if (parameters.length != 2) {
            throw "You must inform the var and the value";
        }

        if (!this.config.context.action) {
            this.config.context.action = {};
        }

        if (!this.config.context.action.setEnv) {
            this.config.context.action.setEnv = {};
        }

        if (!this.config.context.action.setEnv.env) {
            this.config.context.action.setEnv.env = {};
        }

        let key = parameters[0];
        let value = parameters[1];
        log.info(`ENV ${key} = ${value}`);
        this.config.setVar(key, value);
        this.config.context.action.setEnv.env[key] = value;
    }
}