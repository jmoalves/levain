import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import Action from "./action.ts";
import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';
import {parseArgs} from "../lib/parse_args.ts";

export default class Mkdir implements Action {
    constructor(private config: Config) {
    }

    execute(pkg: Package, parameters: string[]): void {
        let args = parseArgs(parameters, {
            boolean: [
                "compact"
            ]
        });

        if (args._.length != 1) {
            throw "Action - mkdir - You should inform a single directory";
        }

        const dirname = path.resolve(pkg.baseDir, args._[0]);
        try {
            const fileInfo = Deno.statSync(dirname);
            if (fileInfo.isDirectory) {
                return;
            }

            if (fileInfo) {
                throw `Action - mkdir - ${dirname} already exists and it is not a directory`;
            }
        } catch (err) {
            if (err.name != "NotFound") {
                throw err;
            }
        }

        log.info(`MKDIR ${dirname}`);
        Deno.mkdirSync(dirname, {recursive: true});

        if (!args.compact) {
            return;
        }

        this.compactSync(dirname);
    }

    private async compactSync(dirname: string) {
        if (Deno.build.os != "windows") {
            log.warning(`MKDIR - ignoring --compact - Windows only`);
            return;
        }

        const windir = dirname.replace(/\//g, "\\");
        log.info(`COMPACT ${windir}`);
        let args = `compact /q /c /s:${windir}`.split(" ");

        const p = Deno.run({
            cmd: args,
            stdout: "null",
            stderr: "null"
        });

        await p.status();
    }
}