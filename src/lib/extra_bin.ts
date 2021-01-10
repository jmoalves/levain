import * as path from "https://deno.land/std/path/mod.ts";

import Config from "./config.ts";
import OsUtils from "../lib/os_utils.ts";

export default class ExtraBin {
    constructor(private config:Config) {
    }

    get extraBinDir(): string {
        return path.resolve(this.config.levainSrcDir, "extra-bin", Deno.build.os);
    }

    get sevenZipDir(): string {
        OsUtils.onlyInWindows()
        return path.resolve(this.extraBinDir, "7-Zip");
    }

    get gitDir(): string {
        OsUtils.onlyInWindows()
        return path.resolve(this.extraBinDir, "git");
    }

    get curlDir(): string {
        OsUtils.onlyInWindows()
        return path.resolve(this.extraBinDir, "curl");
    }
}
