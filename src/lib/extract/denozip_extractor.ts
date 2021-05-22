import * as log from "https://deno.land/std/log/mod.ts";
import {unZipFromFile} from 'https://deno.land/x/zip@v1.1.1/mod.ts'

import Config from "../config.ts";
import {Extractor} from "./extractor.ts";

export class DenoZip extends Extractor {
    constructor(config: Config) {
        super(config)
    }

    async extractImpl(src: string, dst: string) {
        log.debug(`-- Deno unZIP ${src} => ${dst}`)

        return await unZipFromFile(
            src,
            dst,
            {includeFileName: false}
        )
    }
}
