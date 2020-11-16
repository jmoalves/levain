import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import Action from "../lib/action.ts";
import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';
import { parseArgs } from "../lib/parseArgs.ts";

// TODO: Use native TS/JS implementation instead of extra-bin files.
export default class Extract implements Action {
    constructor(private config:Config) {
    }

    async execute(pkg:Package, parameters:string[]) {
        let args = parseArgs(parameters, {
            boolean: [
                "strip"
            ]
        });

        log.debug(`Args: ${JSON.stringify(args)}`);
        if (args._.length != 2) {
            log.error("You must inform the file to extract and the destination directory");
            Deno.exit(1);
        }

        const src = path.resolve(pkg.pkgDir, args._[0]);
        const dst = path.resolve(pkg.baseDir, args._[1]);

        log.info(`EXTRACT ${src} => ${dst}`);
        const factory:ExtractorFactory = new ExtractorFactory();
        const extractor:Extractor = factory.createExtractor(this.config, src);
        await extractor.extract(args.strip, src, dst);
    }
}

abstract class Extractor {
    constructor(protected config:Config) {
    }

    abstract extractImpl(src: string, dst: string): void;

    async extract(strip: boolean|undefined, src: string, dst: string) {
        await this.extractImpl(src, dst);

        if (strip) {
            this.strip(dst);
        }
    }

    strip(dstDir: string): void {
        let size = 0;
        for (let child of Deno.readDirSync(dstDir)) {
            size++;

            if (size > 1) {
                throw "You should not ask for --strip with more than one child diretory";
            }
        }

        let children = Deno.readDirSync(dstDir);

        // Using temp dir to avoid name clashes
        let tmpRootDir =  Deno.makeTempDirSync({ prefix: 'unzip-strip-' });
        for (let toStrip of children) {
            log.debug(`- STRIP ${path.resolve(dstDir, toStrip.name)}`);
            let tmpDir = path.resolve(tmpRootDir, toStrip.name);
            Deno.renameSync(
                path.resolve(dstDir, toStrip.name),
                tmpDir);

            for (let child of Deno.readDirSync(tmpDir)) {
                var from = path.resolve(tmpDir, child.name);
                var dst = path.resolve(dstDir, child.name);
                Deno.renameSync(from, dst);
            }

            Deno.removeSync(tmpDir);
        }

        Deno.removeSync(tmpRootDir);
    }
}

class ExtractorFactory {
    createExtractor(config:Config, src: string): Extractor {
        if (src.endsWith(".zip")) {
            return new Unzipper(config);
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
    constructor(config:Config) {
        super(config);
    }

    async extractImpl(src: string, dst: string) {
        // TODO: Handle other os's
        if (Deno.build.os != "windows") {
            throw `${Deno.build.os} not supported`;
        }

        log.debug(`- UNZIP ${src} => ${dst}`);

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
    constructor(config:Config) {
        super(config);
    }

    async extractImpl(src: string, dst: string) {
        // TODO: Handle other os's
        if (Deno.build.os != "windows") {
            throw `${Deno.build.os} not supported`;
        }

        log.debug(`- 7z ${src} => ${dst}`);

        let args = `cmd /u /c path ${this.config.extraBinDir};%PATH% && ${this.config.extraBinDir}\\7z.exe x -bd -o${dst} ${src}`.split(" ");

        const p = Deno.run({
            cmd: args,
            stdout: "null"
        });
        
        let status = await p.status();
        if (!status.success) {
            throw "CMD terminated with code " + status.code;
        }    
    }    
}

class UnTar extends Extractor {
    constructor(config:Config) {
        super(config);
    }

    async extractImpl(src: string, dst: string) {
        // TODO: Handle other os's
        if (Deno.build.os != "windows") {
            throw `${Deno.build.os} not supported`;
        }

        log.debug(`- UNTAR ${src} => ${dst}`);

        let args = `cmd /u /c path ${this.config.extraBinDir};%PATH% && ( ${this.config.extraBinDir}\\7z.exe x ${src} -bd -so | ${this.config.extraBinDir}\\7z.exe x -si -bd -ttar -o${dst} )`.split(" ");

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
