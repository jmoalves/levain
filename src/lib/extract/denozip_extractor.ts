import * as log from "https://deno.land/std/log/mod.ts";
import {decompress} from 'https://deno.land/x/zip@v1.2.1/mod.ts'

import Config from "../config.ts";
import {Extractor} from "./extractor.ts";

export class DenoZip extends Extractor {
    constructor(config: Config) {
        super(config)
    }

    async extractImpl(src: string, dst: string) {
        log.debug(`-- Deno unZIP ${src} => ${dst}`)

        return await decompress(
            src,
            dst,
            {includeFileName: false}
        )
    }
}
