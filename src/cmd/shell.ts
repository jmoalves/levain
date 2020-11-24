import * as log from "https://deno.land/std/log/mod.ts";

import Command from "./command.ts";
import Config from "../lib/config.ts";
import FileSystemPackage from "../lib/package/file_system_package.ts";
import { OsShell } from '../lib/shellUtils.ts';

export default class Shell implements Command {
    constructor(private config: Config) {
    }

    async execute(args: string[]) {
        log.info("");
        log.info("==================================");
        log.info(`shell ${JSON.stringify(args)}`);

        let pkgNames:string[] = [];

        if (args && args.length > 1) {
            pkgNames = args;
        } else {
            pkgNames = [ this.config.defaultPackage ];
        }

        let osShell:OsShell = new OsShell(this.config, pkgNames);
        osShell.interactive = true;

        await osShell.execute([]);
    }
}
