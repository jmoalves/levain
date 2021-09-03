import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import Config from "../../lib/config.ts";
import Package from '../../lib/package/package.ts';
import {parseArgs} from "../../lib/parse_args.ts";
import OsUtils from "../../lib/os/os_utils.ts";

import Action from "../action.ts";

export default class AddPathAction implements Action {
    constructor(private config: Config) {
    }

    async execute(pkg: Package | undefined, parameters: string[]): Promise<void> {
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
            await OsUtils.addPathPermanent(newPathItem)
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

        const newPath = path.resolve(newPathItem);
        log.debug(`ADD-PATH ${newPath}`);
        this.config.context.action.addpath.path.push(newPath);
    }
}
