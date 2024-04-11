import Config from "../config.ts";
import OsUtils from "../os/os_utils.ts";
import {SevenZip} from "./sevenzip_extractor.ts";
import {DenoZip} from "./denozip_extractor.ts";
import {UnTar} from "./untar_extractor.ts";
import {Extractor} from "./extractor.ts";

export class ExtractorFactory {
    isTypeSupported(type?: string): boolean {
        if (!type) {
            return true
        }

        return this.supportedTypes().includes(type.toLowerCase())
    }

    supportedTypes() {
        return ["zip", "7z", "tar.gz"]
    }
    
    createExtractor(config: Config, src: string, type?: string): Extractor {
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
