import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {existsSync} from "https://deno.land/std/fs/mod.ts";

import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';
import {parseArgs} from "../lib/parse_args.ts";
import FileCache from '../lib/fs/file_cache.ts';
import { ExtractorFactory, Extractor } from "../lib/extract/extract.ts"

import Action from "./action.ts";

// TODO: Use native TS/JS implementation instead of extra-bin files.
export default class Extract implements Action {
    constructor(
        private config: Config,
    ) {
    }

    async execute(pkg: Package, parameters: string[]) {
        let args = parseArgs(parameters, {
            boolean: [
                "strip"
            ]
        });

        log.debug(`Args: ${JSON.stringify(args)}`);
        if (args._.length != 2) {
            throw new Error("You must inform the file to extract and the destination directory");
        }

        const src = path.resolve(pkg.pkgDir, args._[0]);
        if (!existsSync(src)) {
            throw Error(`Cannot find source file "${src}"`)
        }
        const dst = path.resolve(pkg.baseDir, args._[1]);

        log.info(`EXTRACT ${src} => ${dst}`);
        const fileCache = new FileCache(this.config)
        const cachedSrc = await fileCache.get(src)
        const factory: ExtractorFactory = new ExtractorFactory();
        const extractor: Extractor = factory.createExtractor(this.config, cachedSrc);
        await extractor.extract(args.strip, cachedSrc, dst);
    }
}
