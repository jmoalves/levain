import * as path from "https://deno.land/std/path/mod.ts";

import Action from "../lib/action.ts";
import Config from "../lib/config.ts";
import Package from '../lib/package/package.ts';
import { parseArgs } from "../lib/parseArgs.ts";

export default class Extract implements Action {
    constructor(private config:Config) {
    }

    async execute(context:any, pkg:Package, parameters:string[]) {
        let args = parseArgs(parameters, {
            string: [
            ],
            boolean: [
                "strip"
            ]
        });

        // console.log("Args:", JSON.stringify(args));
        if (args._.length != 2) {
            console.error("You must inform the file to extract and the destination directory");
            throw "Illegal arguments";
        }

        const src = path.resolve(pkg.pkgDir, args._[0]);
        const dst = path.resolve(pkg.baseDir, args._[1]);

        console.log("EXTRACT", src, "=>", dst);
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
            console.log("- STRIP", path.resolve(dstDir, toStrip.name));
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

        console.log("- UNZIP", src, "=>", dst);

        let args = `cmd /c ${this.config.extraBinDir}\\unzip -qn ${src} -d ${dst}`.split(" ");

        const p = Deno.run({
            cmd: args
        });
        
        await p.status();
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

        console.log("- 7z", src, "=>", dst);

        let args = `cmd /c ${this.config.extraBinDir}\\7z.exe x -bd -o${dst} ${src}`.split(" ");

        const p = Deno.run({
            cmd: args,
            stdout: "null"
        });
        
        await p.status();
    }    
}