import Action from "./action.ts";
import Package from "../lib/package/package.ts";
import Config from "../lib/config.ts";
import {existsSync} from "https://deno.land/std/fs/mod.ts";

export default class CheckDirExists implements Action {

    constructor(private config: Config) {
    }

    async execute(pkg: Package, parameters: string[]): Promise<void> {
        const dirs = parameters;
        const found = dirs
            .find(it => existsSync(it))

        if (!found) {
            throw new Error(`dirs not found: ${dirs.join(', ')}`)
        }

        return Promise.resolve(undefined);
    }

}
