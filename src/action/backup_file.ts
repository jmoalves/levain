import * as log from "https://deno.land/std/log/mod.ts";

import Action from "./action.ts";
import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';
import FileUtils from "../lib/file_utils.ts";

export default class BackupFile implements Action {
    constructor(private config: Config) {
    }

    async execute(pkg: Package, parameters: string[]): Promise<void> {
        if (parameters.length != 1) {
            throw `You must inform the file to backup - ${parameters}`;
        }

        let filename = parameters[0];
        let bkp = FileUtils.createBackup(filename);
        log.info(`BACKUP-FILE ${filename} => ${bkp}`);
    }
}
