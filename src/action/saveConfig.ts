import * as log from "https://deno.land/std/log/mod.ts";

import Action from "../lib/action.ts";
import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';

export default class SaveConfig implements Action {
    constructor(private config:Config) {
    }

    execute(pkg:Package, parameters:string[]): void {
        this.config.save();
    }
}