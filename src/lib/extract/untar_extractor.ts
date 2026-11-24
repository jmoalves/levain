import * as log from "@std/log";
import * as path from "@std/path";

import type Config from "../config.ts";
import ExtraBin from "../paths/extra_bin.ts";
import { Extractor } from "./extractor.ts";
import OsUtils from "../os/os_utils.ts";

export class UnTar extends Extractor {
  constructor(config: Config) {
    super(config);
  }

  async extractImpl(src: string, dst: string) {
    // TODO: Handle other os's
    OsUtils.onlyInWindows();

    log.debug(`-- UNTAR ${src} => ${dst}`);

    const sevenZipExe = path.join(ExtraBin.sevenZipDir, "7z.exe");

    const decompress = new Deno.Command(sevenZipExe, {
      args: ["x", "-bd", "-so", "--", src],
      stdout: "piped",
      stderr: "piped",
    }).spawn();

    let extract: Deno.ChildProcess;
    try {
      extract = new Deno.Command(sevenZipExe, {
        args: ["x", "-si", "-bd", "-ttar", "-aoa", `-o${dst}`],
        stdin: "piped",
        stdout: "null",
        stderr: "piped",
      }).spawn();
    } catch (err) {
      await decompress.stdout.cancel().catch(() => {});
      await decompress.stderr.cancel().catch(() => {});
      try {
        decompress.kill();
      } catch {
        // Process may have already exited
      }
      await decompress.status.catch(() => {});
      throw err;
    }

    let pipeError: unknown = undefined;
    const pipePromise = decompress.stdout.pipeTo(extract.stdin).catch((err) => {
      pipeError = err;
    });
    const decompressStderrPromise = new Response(decompress.stderr).text();
    const extractStderrPromise = new Response(extract.stderr).text();

    const [, decompressStatus, extractStatus, decompressStderr, extractStderr] = await Promise.all([
      pipePromise,
      decompress.status,
      extract.status,
      decompressStderrPromise,
      extractStderrPromise,
    ]);

    if (!decompressStatus.success) {
      const errDetail = decompressStderr.trim();
      throw new Error(
        `7z decompress terminated with code ${decompressStatus.code}${errDetail ? `: ${errDetail}` : ""}`,
      );
    }

    if (!extractStatus.success) {
      const errDetail = extractStderr.trim();
      throw new Error(
        `7z tar extract terminated with code ${extractStatus.code}${errDetail ? `: ${errDetail}` : ""}`,
      );
    }

    if (pipeError) {
      throw pipeError;
    }
  }
}
