import * as log from "https://deno.land/std/log/mod.ts";
import Config from "../../lib/config.ts";
import Package from "../../lib/package/package.ts";
import Action from "../action.ts";
import {parseArgs} from "../../lib/parse_args.ts";
import OsUtils from "../../lib/os/os_utils.ts";

export default class AddToStartMenuAction implements Action {

    constructor(private config: Config) {
    }

    async execute(pkg: Package | undefined, parameters: string[]): Promise<void> {
        const args = parseArgs(parameters);

        const targetFile: string = args._[0];
        const folderName = args._[1];

        let message = `ADD-TO-START-MENU ${targetFile}`;
        if (folderName) {
            message += ` ${folderName}`;
        }
        log.info(message);

        return await OsUtils.addToStartMenu(targetFile, folderName);
    }
}
