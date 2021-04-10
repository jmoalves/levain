import * as path from "https://deno.land/std/path/mod.ts";

import LevainVersion from "../levain_version.ts";

import OsUtils from "../lib/os/os_utils.ts";

export default class ExtraBin {
    static get extraBinDir(): string {
        return path.resolve(LevainVersion.levainSrcDir, "extra-bin", Deno.build.os);
    }

    static get sevenZipDir(): string {
        OsUtils.onlyInWindows()
        return path.resolve(ExtraBin.extraBinDir, "7-Zip");
    }

    static get gitDir(): string {
        OsUtils.onlyInWindows()
        return path.resolve(ExtraBin.extraBinDir, "git");
    }

    static get curlDir(): string {
        OsUtils.onlyInWindows()
        return path.resolve(ExtraBin.extraBinDir, "curl");
    }

    static get osUtilsDir(): string {
        OsUtils.onlyInWindows()
        return path.resolve(ExtraBin.extraBinDir, "os-utils");
    }
}
