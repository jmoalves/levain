import * as log from "https://deno.land/std/log/mod.ts";

import Config from "../config.ts";
import OsUtils from "../os/os_utils.ts";
import ExtraBin from "../extra_bin.ts";
import {Extractor} from "./extractor.ts";

export class SevenZip extends Extractor {
    constructor(config: Config) {
        super(config);
    }

    async extractImpl(src: string, dst: string) {
        // TODO: Handle other os's

        log.debug(`-- 7z ${src} => ${dst}`);
        OsUtils.onlyInWindows()

        const command = `${ExtraBin.sevenZipDir}\\7z.exe x -bsp2 -aoa -o${dst} ${src}`;
        await OsUtils.runAndLog(command);
    }
}
