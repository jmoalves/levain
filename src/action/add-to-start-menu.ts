import Config from "../lib/config.ts";
import Package from "../lib/package/package.ts";
import Action from "./action.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import * as log from "https://deno.land/std/log/mod.ts";
import {parseArgs} from "../lib/parse_args.ts";
import {ensureDirSync} from "https://deno.land/std/fs/mod.ts";
import OsUtils from "../lib/os/os_utils.ts";

export default class AddToStartMenuAction implements Action {

    constructor(private config: Config) {
    }

    async execute(pkg: Package | undefined, parameters: string[]): Promise<void> {
        const args = parseArgs(parameters);

        const targetFile: string = args._[0];
        const folderName = args._[1];
        if (folderName) {
            log.info(`ADD-TO-START-MENU ${targetFile} ${folderName}`);
        } else {
            log.info(`ADD-TO-START-MENU ${targetFile}`);
        }

        const windowsFile = targetFile.replace("file:///", '');
        const resolvedTargetFile = path.resolve(windowsFile);

        //With Folder
        if (parameters.length == 2) {
            const userProfile = Deno.env.get("USERPROFILE");
            const startMenuPath = `${userProfile}\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs`;
            const folderPath = path.resolve(startMenuPath, folderName);
            ensureDirSync(folderPath);

            const script = OsUtils.getScriptUri('addToStartMenuWithinFolder.cmd')
            const createShortcut = Deno.run({cmd: [script, resolvedTargetFile, folderName]});
            const result = await createShortcut.status();
            createShortcut.close();
        } else {
            const script = OsUtils.getScriptUri('addToStartMenu.cmd')
            const cmd = Deno.run({cmd: [script, resolvedTargetFile]});
            const result = await cmd.status();
            cmd.close();
        }
    }
}
