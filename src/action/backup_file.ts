import * as log from "jsr:@std/log";

import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';
import {FileUtils} from "../lib/fs/file_utils.ts";

import Action from "./action.ts";

export default class BackupFile implements Action {
    constructor(private config: Config) {
    }

    async execute(pkg: Package | undefined, parameters: string[]): Promise<void> {
        if (parameters.length != 1) {
            throw `You must inform the file to backup - ${parameters}`;
        }

        let filename = parameters[0];
        let bkp = FileUtils.createBackup(filename);
        log.debug(`BACKUP-FILE ${filename} => ${bkp}`);
    }
}
