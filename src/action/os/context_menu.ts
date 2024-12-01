import * as log from "jsr:@std/log";

import Config from "../../lib/config.ts";
import Package from '../../lib/package/package.ts';
import {parseArgs} from "../../lib/parse_args.ts";
import Loader from '../../lib/loader.ts';

import Action from "../action.ts";

export default class ContextMenu implements Action {
    constructor(private config: Config) {
    }

    async execute(pkg: Package | undefined, parameters: string[]) {
        log.debug(`CONTEXT-MENU ${parameters}`);

        if (!parameters || parameters.length < 1 || parameters[0] != "folders") {
            throw "contextMenu - You must inform the 'folders' sub action";
        }

        parameters.shift(); // remove the folders sub action
        let args = parseArgs(parameters, {
            stringOnce: [
                "id",
                "name",
                "cmd"
            ]
        });

        log.debug(`- ARGS: ${JSON.stringify(args)}`);

        if (!args.id || args.id.length == 0) {
            throw "contextMenu - You must inform the 'id' option";
        }

        if (!args.name || args.name.length == 0) {
            throw "contextMenu - You must inform the 'name' option";
        }

        if (!args.cmd || args.cmd.length == 0) {
            throw "contextMenu - You must inform the 'cmd' option";
        }

        if (args.id.includes(" ")) {
            throw "contextMenu - The 'id' option must NOT contain spaces";
        }

        if (!pkg) {
            throw Error("No package for action contextMenu")
        }

        let tempFilename = await this.templateRegistry(pkg, args);
        await this.regImport(pkg, args, tempFilename);
    }

    private async templateRegistry(pkg: Package, args: any) {
        const tempFilename = Deno.makeTempFileSync({prefix: 'levain-temp-'});
        log.debug(`- tempReg - ${tempFilename}`);
        let action = `template --replace=/@@shellID@@/g --with="${args.id}" --replace=/@@shellName@@/g --with="${args.name}" --replace=/@@shellCmd@@/g --with="${args.cmd}" --doubleBackslash \${pkg.levain.recipesDir}/levain-shell.reg ${tempFilename}`;
        let loader = new Loader(this.config);
        await loader.action(pkg, action);

        return tempFilename;
    }

    private async regImport(pkg: Package, args: any, tempFilename: string) {
        let action = `levainShell reg import ${tempFilename}`;
        let loader = new Loader(this.config);
        await loader.action(pkg, action);

        //Deno.removeSync(tempFilename);
    }
}
