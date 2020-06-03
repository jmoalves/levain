import * as path from "https://deno.land/std/path/mod.ts";

import Action from "../lib/action.ts";
import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';

export default class AddPath implements Action {
    constructor(private config:Config) {
    }

    execute(context: any, pkg:Package, parameters:string[]): void {
        if (parameters.length != 1) {
            throw "You must inform the path";
        }

        if (!context.action) {
            context.action = {};
        }

        if (!context.action.addpath) {
            context.action.addpath = {};
        }

        if (!context.action.addpath.path) {
            context.action.addpath.path = [];
        }

        context.action.addpath.path.push(path.resolve(parameters[0]));
    }
}