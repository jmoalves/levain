import Package from '../../lib/package/package.ts';
import Action from '../action.ts';
import {parseArgs} from "../../lib/parse_args.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import Config from "../../lib/config.ts";


export default class AddToStartupAction implements Action {

    constructor(private config: Config) {
    }


    async execute(pkg: Package | undefined, parameters: string[]): Promise<void> {
        const args = parseArgs(parameters);

        const targetFile: string = args._[0];
        const windowsFile = targetFile.replace("file:///", '');
        const resolvedTargetFile = path.resolve(windowsFile);
        const cmd = Deno.run({cmd: ["extra-bin/windows/os-utils/addToStartup.cmd", resolvedTargetFile]});
        const result = await cmd.status();
        cmd.close();
    }
}
