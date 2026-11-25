import * as path from "@std/path";

import LevainPaths from "./levain_paths.ts";

export default class ExtraBin {
  static get extraBinDir(): string {
    return path.resolve(LevainPaths.levainSrcDir, "extra-bin", Deno.build.os);
  }

  static get sevenZipDir(): string {
    return path.resolve(ExtraBin.extraBinDir, "7-zip");
  }

  static get gitDir(): string {
    return path.resolve(ExtraBin.extraBinDir, "git");
  }
}
