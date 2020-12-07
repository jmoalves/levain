import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import Action from "./action.ts";
import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';

export default class AddPath implements Action {
    constructor(private config: Config) {
    }

    async execute(pkg: Package, parameters: string[]): Promise<void> {
        if (parameters.length != 1) {
            throw "You must inform the path";
        }

        if (!this.config.context.action) {
            this.config.context.action = {};
        }

        if (!this.config.context.action.addpath) {
            this.config.context.action.addpath = {};
        }

        if (!this.config.context.action.addpath.path) {
            this.config.context.action.addpath.path = [];
        }

        let newPath = path.resolve(parameters[0]);
        log.info(`ADD-PATH ${newPath}`);
        this.config.context.action.addpath.path.push(newPath);
    }
}