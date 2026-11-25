import * as log from "@std/log";
import * as path from "@std/path";
import { existsSync } from "@std/fs";

import type Config from "../config.ts";
import ExtraBin from "../paths/extra_bin.ts";
import { Extractor } from "./extractor.ts";
import OsUtils from "../os/os_utils.ts";

export class UnTar extends Extractor {
  constructor(config: Config) {
    super(config);
  }

  resolveNativeTar(): string | undefined {
    if (OsUtils.isWindows()) {
      // Prefer Microsoft-signed bsdtar in System32: avoids PATH shadowing and GNU tar
      // misinterpreting Windows drive letters (C:\...) as remote hosts.
      const systemTar = OsUtils.windowsSystemToolPath("tar.exe");
      return existsSync(systemTar) ? systemTar : undefined;
    }
    return OsUtils.findInPath("tar");
  }

  async extractImpl(src: string, dst: string) {
    log.debug(`-- UNTAR ${src} => ${dst}`);

    const nativeTar = this.resolveNativeTar();
    if (nativeTar) {
      await this.extractWithNativeTar(nativeTar, src, dst);
      return;
    }

    if (OsUtils.isWindows()) {
      const sevenZipExe = path.join(ExtraBin.sevenZipDir, "7z.exe");
      if (existsSync(sevenZipExe)) {
        await this.extractWithSevenZip(sevenZipExe, src, dst);
        return;
      }
    }

    throw new Error(`Unable to extract ${src}: native 'tar' not found in PATH`);
  }

  private async extractWithNativeTar(tarExe: string, src: string, dst: string): Promise<void> {
    const absSrc = path.resolve(src);
    const absDst = path.resolve(dst);

    const proc = new Deno.Command(tarExe, {
      args: ["-xzf", absSrc, "-C", absDst],
      stdout: "null",
      stderr: "piped",
    });
    const { success, code, stderr } = await proc.output();
    if (!success) {
      const errDetail = OsUtils.decodeOutput(stderr).trim();
      throw new Error(
        `tar extract terminated with code ${code}${errDetail ? `: ${errDetail}` : ""}`,
      );
    }
  }

  async extractWithSevenZip(sevenZipExe: string, src: string, dst: string): Promise<void> {
    const absSrc = path.resolve(src);
    const absDst = path.resolve(dst);

    const decompress = new Deno.Command(sevenZipExe, {
      args: ["x", "-bd", "-so", "--", absSrc],
      stdout: "piped",
      stderr: "piped",
    }).spawn();

    let extract: Deno.ChildProcess;
    try {
      extract = new Deno.Command(sevenZipExe, {
        args: ["x", "-si", "-bd", "-ttar", "-aoa", `-o${absDst}`],
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
