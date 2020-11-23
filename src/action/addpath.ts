import * as path from "https://deno.land/std/path/mod.ts";

import Action from "../lib/action.ts";
import Config from "../lib/config.ts";
import FileSystemPackage from '../lib/package/file_system_package.ts';

export default class AddPath implements Action {
    constructor(private config: Config) {
    }

    execute(pkg: FileSystemPackage, parameters: string[]): void {
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

        this.config.context.action.addpath.path.push(path.resolve(parameters[0]));
    }
}