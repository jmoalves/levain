import * as log from "https://deno.land/std/log/mod.ts";
import {copySync, existsSync, walkSync} from "https://deno.land/std/fs/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';
import {parseArgs} from "../lib/parse_args.ts";

import Action from "./action.ts";
import { FileUtils } from "../lib/fs/file_utils.ts";

export default class CopyAction implements Action {
    constructor(private config: Config) {
    }

    async execute(pkg: Package|undefined, parameters: string[]): Promise<void> {
        let args = parseArgs(parameters, {
            boolean: [
                "verbose",
                "strip",
                'ifNotExists',
            ]
        });

        if (!pkg) {
            throw Error("No package for action copy")
        }

        const dst = FileUtils.resolve(pkg.baseDir, args._.pop());
        const src = args._.map((element: string) => FileUtils.resolve(pkg.pkgDir, element));

        if (!dst) {
            throw "Action - copy - You must inform the destination";
        }

        if (!src || src?.length < 1) {
            throw "Action - copy - You must inform the source(s)";
        }

        let copyToDir = false;
        try {
            const fileInfo = Deno.statSync(dst);
            if (args.ifNotExists && existsSync(dst)) {
                return
            }

            if (fileInfo.isDirectory) {
                copyToDir = true;
            }
        } catch (err) {
        }

        const len = (src?.length || 0);
        if (len > 1 && !copyToDir) {
            throw "Action - copy - Unable to copy multiple sources to a single file";
        }

        await this.copy(src, dst, copyToDir, args)
    }

    private async copy(src: string[], dst: string, copyToDir:boolean, args: any) {
        if (!src) {
            return
        }

        log.info(`COPY ${src} => ${dst}`);

        for (let item of src) {
            log.debug(`- CHECK ${item}`);
            try {
                if (FileUtils.isFileSystemUrl(item)) {
                    this.copySrcFromFileSystem(item, dst, copyToDir, args)
                } else {
                    await this.copySrcFromUrl(item, dst, copyToDir, args)
                }
            } catch (err) {
                log.error(`Error in ${item}`);
                throw err;    
            }
        }
    }

    private copySrcFromFileSystem(item: string, dst: string, copyToDir: boolean, args: any) {
        const fileInfo = Deno.statSync(item);
        if (args.strip && fileInfo.isDirectory) {
            for (const entry of walkSync(item)) {
                if (entry.path == item) {
                    continue;
                }

                const writeTo = path.resolve(dst, entry.name)
                this.doCopy(args, entry.path, writeTo);
            }
        } else {
            let realDst = dst;
            if (copyToDir) {
                realDst = path.resolve(dst, path.basename(item));
            }

            this.doCopy(args, item, realDst);
        }
    }

    private async copySrcFromUrl(url: string, dst: string, copyToDir: boolean, args: any) {
        let realDst = dst;
        if (copyToDir) {
            realDst = path.resolve(dst, path.basename(url));
        }

        await FileUtils.copyWithProgress(url, realDst)
    }

    private doCopy(args: any, src: string, dst: string) {
        if (args.verbose) {
            log.debug(`- COPY ${src} => ${dst}`);
        }

        try {
            copySync(src, dst, {overwrite: true});
        } catch (err) {
            log.error(`ERROR: COPY ${src} => ${dst} ${JSON.stringify(err)}`);
            throw err;
        }
    }
}
