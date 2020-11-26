import * as log from "https://deno.land/std/log/mod.ts";

import Command from "./command.ts";
import Config from "../lib/config.ts";
import {OsShell} from '../lib/os_shell.ts';

export default class Shell implements Command {
    constructor(private config: Config) {
    }

    async execute(args: string[]) {
        log.info("");
        log.info("==================================");
        log.info(`shell ${JSON.stringify(args)}`);

        let pkgNames: string[] = [];

        if (args && args.length > 0) {
            pkgNames = args;
        } else {
            pkgNames = [this.config.defaultPackage];
        }

        let osShell: OsShell = new OsShell(this.config, pkgNames, true);
        osShell.interactive = true;

        await osShell.execute([]);
    }
}
