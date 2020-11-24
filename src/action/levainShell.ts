import * as log from "https://deno.land/std/log/mod.ts";

import Action from "../lib/action.ts";
import Config from "../lib/config.ts";
import FileSystemPackage from '../lib/package/file_system_package.ts';
import { parseArgs } from "../lib/parseArgs.ts";
import { OsShell } from '../lib/shellUtils.ts';

export default class LevainShell implements Action {
    constructor(private config: Config) {
    }

    async execute(pkg: FileSystemPackage, parameters: string[]) {
        log.info(`LEVAIN-SHELL ${pkg.name} ${JSON.stringify(parameters)}`);

        let myArgs = parseArgs(parameters, {
            stringOnce: [
                "saveVar"
            ],
            boolean: [
                "stripCRLF",
                "ignoreErrors"
            ]
        });

        let osShell:OsShell = new OsShell(this.config, [ pkg.name ]);
        osShell.saveVar = myArgs.saveVar;
        osShell.interactive = false;
        osShell.stripCRLF = myArgs.stripCRLF;
        osShell.ignoreErrors = myArgs.ignoreErrors;

        await osShell.execute(myArgs._);
    }
}
