import Config from "../config.ts";
import OsUtils from "../os/os_utils.ts";
import {SevenZip} from "./sevenzip_extractor.ts";
import {DenoZip} from "./denozip_extractor.ts";
import {UnTar} from "./untar_extractor.ts";
import {Extractor} from "./extractor.ts";

export enum ExtractType {
    Zip,
    SevenZip,
    TarGz
}

export class ExtractorFactory {
    private typeFrom(strType?: string): ExtractType | undefined {
        switch (strType?.toLowerCase()) {
        case "zip":
            return ExtractType.Zip

        case "7z":
            return ExtractType.SevenZip

        case "tar.gz":
        case "tgz":
                return ExtractType.TarGz

        default:
            return undefined
        }
    }

    isTypeSupported(type?: string): boolean {
        return this.typeFrom(type)
    }

    createExtractor(config: Config, src: string, type?: ExtractType): Extractor {
        if (!this.isTypeSupported(type)) {
            throw `${src} - file not supported.`;
        }

        let localType = type
        if (!localType) {
            if (src.endsWith(".zip")) {
                localType = "zip"
            } else if (src.endsWith(".7z.exe")) {
                localType = "7z"
            } else if (src.endsWith(".tar.gz")) {
                localType = "tar.gz"
            }
        }

        switch (localType) {
        case "zip":
            if (OsUtils.isWindows()) {
                return new SevenZip(config);
            } else {
                return new DenoZip(config)
            }

        case "7z":
            return new SevenZip(config);

        case "tar.gz":
            return new UnTar(config);

        default:
            throw `${src} - file not supported.`;
        }
    }
}
