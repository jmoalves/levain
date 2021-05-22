import Config from "../config.ts";
import OsUtils from "../os/os_utils.ts";
import {SevenZip} from "./sevenzip_extractor.ts";
import {DenoZip} from "./denozip_extractor.ts";
import {UnTar} from "./untar_extractor.ts";
import {Extractor} from "./extractor.ts";

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
