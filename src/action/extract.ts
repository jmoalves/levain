import * as log from "https://deno.land/std/log/mod.ts";

import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';
import {parseArgs} from "../lib/parse_args.ts";
import FileCache from '../lib/fs/file_cache.ts';
import {Extractor} from "../lib/extract/extractor.ts"

import Action from "./action.ts";
import {FileUtils} from "../lib/fs/file_utils.ts";
import {ExtractorFactory} from "../lib/extract/extractor_factory.ts";

export default class Extract implements Action {
    constructor(
        private config: Config,
    ) {
    }

    async execute(pkg: Package | undefined, parameters: string[]) {
        let args = parseArgs(parameters, {
            boolean: [
                "strip"
            ],
            stringOnce: [
                "type"
            ]
        });

        log.debug(`Args: ${JSON.stringify(args)}`);
        if (args._.length != 2) {
            throw new Error("You must inform the file to extract and the destination directory");
        }

        if (args.type && !["zip"].includes(args.type.toLowerCase())) {
            throw new Error(`Unknown type '${args.type}'`)
        }

        const src = FileUtils.resolve(pkg?.pkgDir, args._[0])
        const dst = FileUtils.resolve(pkg?.baseDir, args._[1]);

        if (FileUtils.isFileSystemUrl(src)) {
            FileUtils.throwIfNotExists(src);
        }

        FileUtils.throwIfNotExists(dst);

        log.debug(`EXTRACT ${src} => ${dst}`);
        const fileCache = new FileCache(this.config)
        const cachedSrc = await fileCache.get(src)
        const factory: ExtractorFactory = new ExtractorFactory();
        const extractor: Extractor = factory.createExtractor(this.config, cachedSrc, args.type);
        await extractor.extract(args.strip, cachedSrc, dst);
    }
}
