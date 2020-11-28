import * as log from "https://deno.land/std/log/mod.ts";

import Action from "./action.ts";
import Config from "../lib/config.ts";
import FileSystemPackage from '../lib/package/file_system_package.ts';

export default class Noop implements Action {
    constructor(private config: Config, private actionName: string) {
    }

    execute(pkg: FileSystemPackage, parameters: string[]): void {
        log.info(`NOOP[${this.actionName}] ${parameters}`);
    }
}