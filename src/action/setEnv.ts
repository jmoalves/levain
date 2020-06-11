import * as path from "https://deno.land/std/path/mod.ts";

import Action from "../lib/action.ts";
import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';

export default class SetEnv implements Action {
    constructor(private config:Config) {
    }

    execute(context: any, pkg:Package, parameters:string[]): void {
        if (parameters.length != 2) {
            throw "You must inform the var and the value";
        }

        if (!context.action) {
            context.action = {};
        }

        if (!context.action.setEnv) {
            context.action.setEnv = {};
        }

        if (!context.action.setEnv.env) {
            context.action.setEnv.env = {};
        }

        let key = parameters[0];
        let value = parameters[1];
        console.log("ENV", key, "=", value);
        this.config.setVar(key, value);
        context.action.setEnv.env[key] = value;
    }
}