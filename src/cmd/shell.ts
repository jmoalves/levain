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

        if (!args || args.length != 1) {
            // FIXME: We must have a default option
            log.error("You should inform the package");
            Deno.exit(1);
        }

        let pkgName = args[0];
        let osShell:OsShell = new OsShell(this.config, pkgName);
        osShell.interactive = true;

        await osShell.execute([]);
    }
}
