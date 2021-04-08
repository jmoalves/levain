import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {unZipFromFile} from 'https://deno.land/x/zip@v1.1.0/mod.ts'

import Config from "../config.ts";
import ExtraBin from "../extra_bin.ts";
import { Timer } from "../timer.ts";
import { FileUtils } from "../fs/file_utils.ts";
import OsUtils from "../os/os_utils.ts";

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

// TODO: Use native TS/JS implementation instead of extra-bin files.
export class ExtractorFactory {
    createExtractor(config: Config, src: string): Extractor {
        if (src.endsWith(".zip")) {
            if (OsUtils.isWindows()) {
                return new SevenZip(config);
            } else {
                return new DenoZip(config)
            }
        }

        if (src.endsWith(".7z.exe")) {
            return new SevenZip(config);
        }

        if (src.endsWith(".tar.gz")) {
            return new UnTar(config);
        }

        throw `${src} - file not supported.`;
    }
}

export class DenoZip extends Extractor {
    constructor(config: Config) {
        super(config);
    }

    async extractImpl(src: string, dst: string) {
        log.debug(`-- Deno unZIP ${src} => ${dst}`);

        return await unZipFromFile(
            src,
            dst,
            {includeFileName: false}
        )
    }
}


export class SevenZip extends Extractor {
    constructor(config: Config) {
        super(config);
    }

    async extractImpl(src: string, dst: string) {
        // TODO: Handle other os's
        log.debug(`-- 7z ${src} => ${dst}`);
        OsUtils.onlyInWindows()

        const command = `cmd /u /c path ${ExtraBin.sevenZipDir};%PATH% && ${ExtraBin.sevenZipDir}\\7z.exe x -bsp2 -aoa -o${dst} ${src}`;
        await OsUtils.runAndLog(command);
    }
}

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

        let args = `cmd /u /c path ${ExtraBin.sevenZipDir};%PATH% && ( ${ExtraBin.sevenZipDir}\\7z.exe x ${src} -bsp2 -so | ${ExtraBin.sevenZipDir}\\7z.exe x -si -bd -ttar -o${dst} )`.split(" ");

        const p = Deno.run({
            stdout: "null",
            cmd: args
        });

        let status = await p.status();
        if (!status.success) {
            throw "CMD terminated with code " + status.code;
        }
    }
}
