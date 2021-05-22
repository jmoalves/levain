import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import Config from "../config.ts";
import {Timer} from "../timer.ts";
import {FileUtils} from "../fs/file_utils.ts";

export abstract class Extractor {
    constructor(protected config: Config) {
    }

    async extract(strip: boolean, src: string, dst: string) {
        let extractedTempDir = await this.extractToTemp(src)
        this.move(strip, extractedTempDir, dst);
    }


    async copy(srcFile: string, dstFile: string): Promise<string> {
        log.info(`- COPY ${srcFile} => ${dstFile}`);

        //copySync(srcFile, dstPath);
        await FileUtils.copyWithProgress(srcFile, dstFile);
        return dstFile;
    }

    abstract extractImpl(src: string, dst: string): void;

    move(strip: boolean, srcDir: string, dstDir: string): void {
        let count = 0;
        for (let child of Deno.readDirSync(srcDir)) {
            count++;

            let from = path.resolve(srcDir, child.name);
            if (strip) {
                if (count > 1) { // There can be only one!
                    throw `You should not ask for --strip if there are more than one directory`;
                }

                log.debug(`- STRIP ${from}`);
                this.move(false, from, dstDir);
            } else {
                let dst = path.resolve(dstDir, child.name);
                log.debug(`- MOVE ${from} => ${dst}`);
                Deno.renameSync(from, dst);
            }
        }

        Deno.removeSync(srcDir);
    }

    async extractToTemp(file: string): Promise<string> {
        const safeTempDir = this.config.levainSafeTempDir
        log.debug(`safeTempDir ${safeTempDir}`)
        let tempDir = Deno.makeTempDirSync({
            dir: safeTempDir,
            prefix: 'extract-'
        });

        const timer = new Timer()
        log.info(`- EXTRACT ${file} => ${tempDir}`);
        await this.extractImpl(file, tempDir);
        log.info(`- extracted in ${timer.humanize()}`);
        return tempDir
    }

}
