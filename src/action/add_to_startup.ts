import Package from '../lib/package/package.ts';
import Action from './action.ts';
import {parseArgs} from "../lib/parse_args.ts";
import { FileUtils } from "../lib/fs/file_utils.ts";
import * as log from "https://deno.land/std/log/mod.ts";
import {copySync, existsSync, walkSync} from "https://deno.land/std/fs/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import Config from "../lib/config.ts";
import CopyAction from "./copy.ts";
import ActionFactory from "./action_factory.ts";
import TestHelper from "../lib/test/test_helper.ts";


export default class AddToStartupAction implements Action {

    constructor(private config: Config) {
    }


    async execute(pkg: Package|undefined, parameters: string[]): Promise<void> {
        const args = parseArgs(parameters);

        const targetFile:string = args._[0];
        const windowsFile = targetFile.replace("file:///", '');
        const resolvedTargetFile = path.resolve(windowsFile);
        const cmd = Deno.run({cmd:["scripts/addToStartup.cmd", resolvedTargetFile]});
        const result = await cmd.status();
        cmd.close();
    }
}
