import * as log from "https://deno.land/std/log/mod.ts";

import Action from "./action.ts";
import Config from "../lib/config.ts";
import FileSystemPackage from '../lib/package/file_system_package.ts';

export default class DefaultPackage implements Action {
    constructor(private config: Config) {
    }

    execute(pkg: FileSystemPackage, parameters: string[]): void {
        if (parameters.length != 1) {
            throw `You must inform one package ${parameters}`;
        }

        let pkgName = parameters[0];
        log.info(`DEFAULT-PACKAGE ${pkgName}`);
        this.config.defaultPackage = pkgName;
    }
}