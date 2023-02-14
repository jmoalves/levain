import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import Config from "../config.ts";
import {Timer} from "../timer.ts";
import {FileUtils} from "../fs/file_utils.ts";
import ConsoleFeedback from "../utils/console_feedback.ts";
import StringUtils from "../utils/string_utils.ts";
import {retry} from "../utils/utils.ts";

export abstract class Extractor {
    readonly feedback = new ConsoleFeedback();

    private readonly maxRetries = 5;

    constructor(protected config: Config) {
    }

    async extract(strip: boolean, src: string, dst: string) {
        let extractedTempDir = await this.extractToTemp(src)
        await this.move(strip, extractedTempDir, dst);
    }


    async copy(srcFile: string, dstFile: string): Promise<string> {
        log.debug(`- COPY ${srcFile} => ${dstFile}`);

        await FileUtils.copyWithProgress(srcFile, dstFile);
        return dstFile;
    }

    abstract extractImpl(src: string, dst: string): void;

    async move(strip: boolean, srcDir: string, dstDir: string): Promise<void> {
        let count = 0;
        for (let child of Deno.readDirSync(srcDir)) {
            count++;

            let from = path.resolve(srcDir, child.name);
            if (strip) {
                if (count > 1) { // There can be only one!
                    throw `You should not ask for --strip if there are more than one directory`;
                }

                log.debug(`- STRIP ${from}`);
                await this.move(false, from, dstDir);
            } else {
                let dst = path.resolve(dstDir, child.name);
                log.debug(`- MOVE ${from} => ${dst}`);
                await retry(this.maxRetries, () => Deno.renameSync(from, dst));
            }
        }

        await retry(this.maxRetries, () => Deno.removeSync(srcDir));
    }

    async extractToTemp(file: string): Promise<string> {
        const safeTempDir = this.config.levainSafeTempDir
        log.debug(`safeTempDir ${safeTempDir}`)
        let tempDir = Deno.makeTempDirSync({
            dir: safeTempDir,
            prefix: 'extract-'
        });

        const timer = new Timer()
        log.debug(`- EXTRACT ${file} => ${tempDir}`);
        this.feedback.start(`# ${StringUtils.compressText(file, 80)}`)

        let tick = setInterval(() => this.feedback.show(), 300)
        await this.extractImpl(file, tempDir)
        clearInterval(tick)
        
        this.feedback.reset(`# ${StringUtils.compressText(file, 80)} in ${timer.humanize()}`)
        log.debug(`- extracted in ${timer.humanize()}`);
        return tempDir
    }
}
