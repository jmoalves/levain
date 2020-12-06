import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import Action from "./action.ts";
import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';
import {parseArgs} from "../lib/parse_args.ts";
import OsUtils from "../lib/os_utils.ts";
import {Timer} from "../lib/timer.ts";

// TODO: Use native TS/JS implementation instead of extra-bin files.
export default class Extract implements Action {
    constructor(private config: Config) {
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

        // TODO: Check files
        const src = path.resolve(pkg.pkgDir, args._[0]);
        const dst = path.resolve(pkg.baseDir, args._[1]);

        log.info(`EXTRACT ${src} => ${dst}`);
        const factory: ExtractorFactory = new ExtractorFactory();
        const extractor: Extractor = factory.createExtractor(this.config, src);
        await extractor.extract(args.strip, src, dst);
    }
}

abstract class Extractor {
    constructor(protected config: Config) {
    }

    async extract(strip: boolean, src: string, dst: string) {
        // TODO: Use download cache instead of temp file
        let tmpRootDir = Deno.makeTempDirSync({
            dir: this.config.levainSafeTempDir,
            prefix: 'extract-'
        });
        log.debug(`- TEMP ${tmpRootDir}`);

        const timer = new Timer();
        let tmpSrc = this.copy(src, tmpRootDir);
        log.debug(`- copied in ${timer.humanize()}`);

        let tmpDstDir = Deno.makeTempDirSync({
            dir: tmpRootDir,
            prefix: 'extract-dst-'
        });
        log.debug(`- DST ${tmpDstDir}`);

        log.debug(`- EXTRACT ${tmpSrc} => ${tmpDstDir}`);
        timer.reset();
        await this.extractImpl(tmpSrc, tmpDstDir);
        log.debug(`- extracted in ${timer.humanize()}`);

        this.move(strip, tmpDstDir, dst);

        log.debug(`- DEL ${tmpRootDir}`);
        Deno.removeSync(tmpRootDir, {recursive: true});
    }

    copy(src: string, dst: string): string {
        let dstPath = path.resolve(dst, path.basename(src));
        log.debug(`- COPY ${src} => ${dstPath}`);

        Deno.copyFileSync(src, dstPath);
        return dstPath;
    }

    abstract extractImpl(src: string, dst: string): void;

    move(strip: boolean, srcDir: string, dstDir: string): void {
        let count = 0;
        for (let child of Deno.readDirSync(srcDir)) {
            count++;

            let from = path.resolve(srcDir, child.name);
            if (strip) {
                if (count > 1) { // There can be only one!
                    throw `You should not for --strip if there are more the one directory`;
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
}

class ExtractorFactory {
    createExtractor(config: Config, src: string): Extractor {
        if (src.endsWith(".zip")) {
            return new SevenZip(config); //new Unzipper(config);
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

class Unzipper extends Extractor {
    constructor(config: Config) {
        super(config);
    }

    async extractImpl(src: string, dst: string) {
        // TODO: Handle other os's
        if (Deno.build.os != "windows") {
            throw `${Deno.build.os} not supported`;
        }

        log.debug(`-- UNZIP ${src} => ${dst}`);

        let args = `cmd /u /c path ${this.config.extraBinDir};%PATH% && ${this.config.extraBinDir}\\unzip -qn ${src} -d ${dst}`.split(" ");

        const p = Deno.run({
            cmd: args
        });

        let status = await p.status();
        if (!status.success) {
            throw "CMD terminated with code " + status.code;
        }
    }
}


class SevenZip extends Extractor {
    constructor(config: Config) {
        super(config);
    }

    async extractImpl(src: string, dst: string) {
        // TODO: Handle other os's
        log.debug(`-- 7z ${src} => ${dst}`);
        OsUtils.onlyInWindows()

        const command = `cmd /u /c path ${this.config.extraBinDir};%PATH% && ${this.config.extraBinDir}\\7z.exe x -bsp2 -o${dst} ${src}`;
        await OsUtils.runAndLog(command);
    }
}

class UnTar extends Extractor {
    constructor(config: Config) {
        super(config);
    }

    async extractImpl(src: string, dst: string) {
        // TODO: Handle other os's
        if (Deno.build.os != "windows") {
            throw `${Deno.build.os} not supported`;
        }

        log.debug(`-- UNTAR ${src} => ${dst}`);

        let args = `cmd /u /c path ${this.config.extraBinDir};%PATH% && ( ${this.config.extraBinDir}\\7z.exe x ${src} -bsp2 -so | ${this.config.extraBinDir}\\7z.exe x -si -bd -ttar -o${dst} )`.split(" ");

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
