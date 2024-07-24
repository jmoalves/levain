import * as log from "https://deno.land/std/log/mod.ts";

import Config from "../config.ts";
import OsUtils from "../os/os_utils.ts";
import {SevenZip} from "./sevenzip_extractor.ts";
import {DenoZip} from "./denozip_extractor.ts";
import {UnTar} from "./untar_extractor.ts";
import {Extractor} from "./extractor.ts";

export enum ExtractType {
    Zip = 'zip',
    SevenZip = '7z',
    TarGz = 'tar.gz'
}

export class ExtractorFactory {
    private typeFromFile(filename?: string): ExtractType | undefined {
        if (!filename) {
            return undefined
        }

        const normalizedFilename = filename.toLowerCase()
        if (normalizedFilename.endsWith(".zip")) {
            return ExtractType.Zip            
        } 
        
        if (normalizedFilename.endsWith(".7z")) {
            return ExtractType.SevenZip
        }

        if (normalizedFilename.endsWith(".7z.exe")) {
            return ExtractType.SevenZip
        }

        if (normalizedFilename.endsWith(".tar.gz")) {
            return ExtractType.TarGz
        }

        if (normalizedFilename.endsWith(".tgz")) {
            return ExtractType.TarGz
        }

        return undefined
    }

    private typeFromString(strType?: string): ExtractType | undefined {
        switch (strType?.toLowerCase()) {
        case "zip":
            return ExtractType.Zip

        case "7z":
        case "7z.exe":
            return ExtractType.SevenZip

        case "tar.gz":
        case "tgz":
                return ExtractType.TarGz

        default:
            return undefined
        }
    }

    isTypeSupported(type?: string): boolean {
        return this.typeFromString(type) != undefined
    }

    createExtractor(config: Config, src: string, type?: string): Extractor {
        if (type && !this.isTypeSupported(type)) {
            throw `${src} - file not supported (1).`;
        }

        const localType = this.typeFromString(type) || this.typeFromFile(src)
        switch (localType) {
        case ExtractType.Zip:
            if (OsUtils.isWindows()) {
                return new SevenZip(config);
            } else {
                return new DenoZip(config)
            }

        case ExtractType.SevenZip:
            return new SevenZip(config);

        case ExtractType.TarGz:
            return new UnTar(config);

        default:
            throw `${src} - file not supported (2).`;
        }
    }
}
