import * as log from "https://deno.land/std/log/mod.ts";

import {existsSync} from "https://deno.land/std/fs/mod.ts";

import Command from "./command.ts";
import Config from "../lib/config.ts";
import FileSystemPackage from "../lib/package/file_system_package.ts";
import Loader from '../lib/loader.ts';
import {parseArgs} from "../lib/parseArgs.ts";
import { OsShell } from '../lib/shellUtils.ts';

export default class Shell implements Command {
    constructor(private config: Config) {
    }

    async execute(args: string[]) {
        let myArgs = parseArgs(args, {
            stringMany: [
                "package"
            ],
            stringOnce: [
                "saveVar"
            ],
            boolean: [
                "run",
                "stripCRLF",
                "ignoreErrors"
            ]
        });
        log.info(`shell ${JSON.stringify(args)}`);

        if (!myArgs.package) {
            log.error("No package. Use the --package option");
            Deno.exit(1);
        }

        let osShell:OsShell = new OsShell(this.config, myArgs.package);
        osShell.saveVar = myArgs.saveVar;
        osShell.interactive = !myArgs.run;
        osShell.stripCRLF = myArgs.stripCRLF;
        osShell.ignoreErrors = myArgs.ignoreErrors;

        await osShell.execute(myArgs._);
    }
}
