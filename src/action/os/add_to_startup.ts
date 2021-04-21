import * as log from "https://deno.land/std/log/mod.ts";
import Package from '../../lib/package/package.ts';
import Action from '../action.ts';
import {parseArgs} from "../../lib/parse_args.ts";
import Config from "../../lib/config.ts";
import OsUtils from "../../lib/os/os_utils.ts";


export default class AddToStartupAction implements Action {

    constructor(private config: Config) {
    }

    async execute(pkg: Package | undefined, parameters: string[]): Promise<void> {
        const args = parseArgs(parameters);
        const targetFile: string = args._[0];

        log.info(`ADD-TO-STARTUP ${targetFile}`);
        return await OsUtils.addToStartup(targetFile)
    }
}
