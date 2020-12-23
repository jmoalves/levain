import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import Action from "./action.ts";
import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';
import { parseArgs } from "../lib/parse_args.ts";
import OsUtils from "../lib/os_utils.ts";

export default class AddPathAction implements Action {
    constructor(private config: Config) {
    }

    async execute(pkg: Package, parameters: string[]): Promise<void> {
        const myArgs = parseArgs(parameters, {
            boolean: [
                "permanent",
            ]
            
        });

        if (myArgs?._?.length !== 1) {
            throw "You must inform the path";
        }
        const newPathItem = myArgs?._?.[0];

        log.debug("AddPathAction args: " + JSON.stringify(myArgs));

        this.addPathToCurrentShell(newPathItem);

        if (myArgs['permanent']) {
            await OsUtils.addPathPermanent(newPathItem, this.config)
        }
    }

    private addPathToCurrentShell(newPathItem: string) {
        if (!this.config.context.action) {
            this.config.context.action = {};
        }

        if (!this.config.context.action.addpath) {
            this.config.context.action.addpath = {};
        }

        if (!this.config.context.action.addpath.path) {
            this.config.context.action.addpath.path = [];
        }

        let newPath = path.resolve(newPathItem);
        log.info(`ADD-PATH ${newPath}`);
        this.config.context.action.addpath.path.push(newPath);
    }
}