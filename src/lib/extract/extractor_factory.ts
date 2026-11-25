import * as path from "@std/path";
import { existsSync } from "@std/fs";

import type Config from "../config.ts";
import OsUtils from "../os/os_utils.ts";
import ExtraBin from "../paths/extra_bin.ts";
import { SevenZip } from "./sevenzip_extractor.ts";
import { DenoZip } from "./denozip_extractor.ts";
import { UnTar } from "./untar_extractor.ts";
import { type Extractor } from "./extractor.ts";

export enum ExtractType {
  Zip = "zip",
  SevenZip = "7z",
  TarGz = "tar.gz",
}

export class ExtractorFactory {
  /** Threshold above which Windows prefers native C++ 7z.exe (when bundled) for faster large-archive extraction. */
  public static readonly LARGE_ZIP_THRESHOLD_BYTES = 50 * 1024 * 1024;

  private typeFromFile(filename?: string): ExtractType | undefined {
    if (!filename) {
      return undefined;
    }

    const normalizedFilename = filename.toLowerCase();
    if (normalizedFilename.endsWith(".zip")) {
      return ExtractType.Zip;
    }

    if (normalizedFilename.endsWith(".7z")) {
      return ExtractType.SevenZip;
    }

    if (normalizedFilename.endsWith(".7z.exe")) {
      return ExtractType.SevenZip;
    }

    if (normalizedFilename.endsWith(".tar.gz")) {
      return ExtractType.TarGz;
    }

    if (normalizedFilename.endsWith(".tgz")) {
      return ExtractType.TarGz;
    }

    return undefined;
  }

  private typeFromString(strType?: string): ExtractType | undefined {
    switch (strType?.toLowerCase()) {
      case "zip":
        return ExtractType.Zip;

      case "7z":
      case "7z.exe":
        return ExtractType.SevenZip;

      case "tar.gz":
      case "tgz":
        return ExtractType.TarGz;

      default:
        return undefined;
    }
  }

  isTypeSupported(type?: string): boolean {
    return this.typeFromString(type) != undefined;
  }

  private shouldUseSevenZipForZip(src: string): boolean {
    if (!OsUtils.isWindows()) {
      return false;
    }
    const sevenZipExe = path.join(ExtraBin.sevenZipDir, "7z.exe");
    if (!existsSync(sevenZipExe)) {
      return false;
    }
    try {
      const stat = Deno.statSync(src);
      return stat.size >= ExtractorFactory.LARGE_ZIP_THRESHOLD_BYTES;
    } catch {
      return false;
    }
  }

  createExtractor(config: Config, src: string, type?: string): Extractor {
    if (type && !this.isTypeSupported(type)) {
      throw new Error(`${src} - file not supported (1).`);
    }

    const localType = this.typeFromString(type) || this.typeFromFile(src);
    switch (localType) {
      case ExtractType.Zip:
        if (this.shouldUseSevenZipForZip(src)) {
          return new SevenZip(config);
        }
        return new DenoZip(config);

      case ExtractType.SevenZip:
        return new SevenZip(config);

      case ExtractType.TarGz:
        return new UnTar(config);

      default:
        throw new Error(`${src} - file not supported (2).`);
    }
  }
}
