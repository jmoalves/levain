import Action from "./action.ts";
import Package from "../lib/package/package.ts";
import * as log from "https://deno.land/std/log/mod.ts";
import Config from "../lib/config.ts";

export default class Echo implements Action {
    constructor(config: Config) {

    }


    execute(pkg: Package, parameters: string[]): Promise<void> {
        log.info(`ECHO ${parameters.join(', ')}`)

        return Promise.resolve(undefined);
    }

}