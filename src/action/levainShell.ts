import * as log from "https://deno.land/std/log/mod.ts";

import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';
import {parseArgs} from "../lib/parse_args.ts";
import {OsShell} from '../lib/os/os_shell.ts';

import Action from "./action.ts";

export default class LevainShell implements Action {
    constructor(private config: Config) {
    }

    async execute(pkg: Package | undefined, parameters: string[]) {
        if (!pkg) {
            throw Error("No package for action levainShell")
        }

        log.debug(`LEVAIN-SHELL ${pkg.name} ${JSON.stringify(parameters)}`);

        const myArgs = parseArgs(parameters, {
            stringOnce: [
                "saveVar"
            ],
            boolean: [
                "stripCRLF",
                "ignoreErrors"
            ]
        });

        let osShell: OsShell = new OsShell(this.config, [pkg.name]);
        osShell.saveVar = myArgs.saveVar;
        osShell.interactive = false;
        osShell.stripCRLF = myArgs.stripCRLF;
        osShell.ignoreErrors = myArgs.ignoreErrors;

        await osShell.execute(myArgs._);
    }
}
