import * as path from "https://deno.land/std/path/mod.ts";

import Action from "../lib/action.ts";
import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';

export default class Template implements Action {
    constructor(private config:Config) {
    }

    execute(context: any, pkg:Package, parameters:string[]): void {
        console.log("replace", "@" + pkg.name, parameters);
    }
}