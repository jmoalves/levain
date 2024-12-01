import * as log from "jsr:@std/log";

import Config from "../config.ts";
import ExtraBin from "../extra_bin.ts";
import {Extractor} from "./extractor.ts";

export class UnTar extends Extractor {
    constructor(config: Config) {
        super(config);
    }

    async extractImpl(src: string, dst: string) {
        // TODO: Handle other os's
        if (Deno.build.os != "windows") {
            throw `${Deno.build.os} not supported`;
        }

        log.debug(`-- UNTAR ${src} => ${dst}`);

        const args = `/u /c path ${ExtraBin.sevenZipDir};%PATH% && ( ${ExtraBin.sevenZipDir}\\7z.exe x ${src} -bsp2 -so | ${ExtraBin.sevenZipDir}\\7z.exe x -si -bd -ttar -o${dst} )`.split(" ");
        const cmd = new Deno.Command('cmd', { 
            stdout: "null",
            args: args
        });

        const status = await cmd.output();
        if (!status.success) {
            throw "CMD terminated with code " + status.code;
        }
    }
}
