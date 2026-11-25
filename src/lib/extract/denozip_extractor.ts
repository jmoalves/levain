import * as log from "@std/log";
import * as path from "@std/path";
import * as zip from "@zip.js/zip.js";

import type Config from "../config.ts";
import { Extractor } from "./extractor.ts";
import { fileError } from "../utils/error_utils.ts";
import t from "../i18n.ts";

// Avoid lingering idle Web Worker timers in Deno CLI/test processes.
zip.configure({ useWebWorkers: false });

export class DenoFileReader extends zip.Reader<string> {
  private file: Deno.FsFile | undefined;

  constructor(private readonly filePath: string) {
    super(filePath);
  }

  override async init(): Promise<void> {
    if (this.file) {
      return;
    }
    try {
      this.file = await Deno.open(this.filePath, { read: true });
      const stat = await this.file.stat();
      this.size = stat.size;
      await super.init?.();
    } catch (err) {
      this.close();
      throw fileError(err, this.filePath, t("lib.extract.denozip_extractor.extractImplReadError"));
    }
  }

  override async readUint8Array(index: number, length: number): Promise<Uint8Array> {
    if (!this.file) {
      throw new Error(`Zip source file not open: ${this.filePath}`);
    }
    if (length <= 0 || index < 0 || index >= this.size) {
      return new Uint8Array(0);
    }
    const toRead = Math.min(length, this.size - index);
    await this.file.seek(index, Deno.SeekMode.Start);
    const buffer = new Uint8Array(toRead);
    let offset = 0;
    while (offset < toRead) {
      const n = await this.file.read(buffer.subarray(offset));
      if (n === null) {
        break;
      }
      offset += n;
    }
    return offset === toRead ? buffer : buffer.subarray(0, offset);
  }

  close(): void {
    if (this.file) {
      try {
        this.file.close();
      } catch {
        // Ignore already-closed handle
      }
      this.file = undefined;
    }
  }
}

export class DenoZip extends Extractor {
  constructor(config: Config) {
    super(config);
  }

  static resolveSafeEntryPath(dst: string, entryFilename: string, isDirectory: boolean): string {
    if (
      !entryFilename ||
      entryFilename.includes("\0") ||
      path.isAbsolute(entryFilename) ||
      /^[a-zA-Z]:/.test(entryFilename) ||
      entryFilename.startsWith("/") ||
      entryFilename.startsWith("\\")
    ) {
      throw new Error(`Unsafe zip entry path: ${entryFilename}`);
    }

    const dstRoot = path.resolve(dst);
    const normalizedEntry = entryFilename.replaceAll("\\", "/");
    const resolved = path.resolve(dstRoot, normalizedEntry);
    const rel = path.relative(dstRoot, resolved);

    if (
      rel === ".." ||
      rel.startsWith(`..${path.SEPARATOR}`) ||
      path.isAbsolute(rel) ||
      (!isDirectory && rel === "")
    ) {
      throw new Error(`Unsafe zip entry path: ${entryFilename}`);
    }

    return resolved;
  }

  async extractImpl(src: string, dst: string) {
    log.debug(`-- Deno unZIP ${src} => ${dst}`);

    const fileReader = new DenoFileReader(src);
    const reader = new zip.ZipReader(fileReader);

    try {
      const entries = await reader.getEntries();

      for (const entry of entries) {
        if (!entry.filename) continue;

        // Match includeFileName: false from deno.land/x/zip and reject Zip Slip paths
        const outputPath = DenoZip.resolveSafeEntryPath(dst, entry.filename, entry.directory);

        if (entry.directory) {
          await Deno.mkdir(outputPath, { recursive: true });
          continue;
        }

        await Deno.mkdir(path.dirname(outputPath), {
          recursive: true,
        });

        let outFile: Deno.FsFile;
        try {
          outFile = await Deno.open(outputPath, { write: true, create: true, truncate: true });
        } catch (err) {
          throw fileError(
            err,
            outputPath,
            t("lib.extract.denozip_extractor.extractImplWriteError", { filePath: src }),
          );
        }

        try {
          await entry.getData!(outFile.writable);
        } catch (err) {
          try {
            outFile.close();
          } catch {
            // Writable stream may have already closed the handle
          }
          throw fileError(
            err,
            outputPath,
            t("lib.extract.denozip_extractor.extractImplWriteError", { filePath: src }),
          );
        }
      }
    } finally {
      try {
        await reader.close();
      } finally {
        fileReader.close();
      }
    }
  }
}
