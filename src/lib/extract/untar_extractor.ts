import * as log from "@std/log";

import type Config from "../config.ts";
import ExtraBin from "../extra_bin.ts";
import { Extractor } from "./extractor.ts";
import OsUtils from "../os/os_utils.ts";

export class UnTar extends Extractor {
  constructor(config: Config) {
    super(config);
  }

  async extractImpl(src: string, dst: string) {
    // TODO: Handle other os's
    if (Deno.build.os != "windows") {
      throw `${Deno.build.os} not supported`;
    }

    log.debug(`-- UNTAR ${src} => ${dst}`);

    const [exec, ...args] = OsUtils.parseCmd(
      `cmd /u /c path ${ExtraBin.sevenZipDir};%PATH% && ( ${ExtraBin.sevenZipDir}\\7z.exe x ${src} -bsp2 -so | ${ExtraBin.sevenZipDir}\\7z.exe x -si -bd -ttar -o${dst} )`
    )

    const pcommand = await new Deno.Command(exec, {
      args: args,
      stdout: "null",
    });

    const status = await pcommand.output();

    if (!status.success) {
      throw "CMD terminated with code " + status.code;
    }
  }
}
