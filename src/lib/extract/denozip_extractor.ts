import * as log from "@std/log";
import * as path from "@std/path";
import * as zip from "@zip.js/zip.js";

import type Config from "../config.ts";
import { Extractor } from "./extractor.ts";
import { fileError } from "../utils/error_utils.ts";
import t from "../i18n.ts";

// Avoid lingering idle Web Worker timers in Deno CLI/test processes.
zip.configure({ useWebWorkers: false });

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

    let fileBytes: Uint8Array<ArrayBuffer>;
    try {
      fileBytes = await Deno.readFile(src);
    } catch (err) {
      throw fileError(err, src, t("lib.extract.denozip_extractor.extractImplReadError"));
    }
    const reader = new zip.ZipReader(new zip.BlobReader(new Blob([fileBytes])));

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

        const writer = new zip.BlobWriter();
        const blob = await entry.getData(writer);

        try {
          await Deno.writeFile(
            outputPath,
            new Uint8Array(await blob.arrayBuffer()),
          );
        } catch (err) {
          throw fileError(err, outputPath, t("lib.extract.denozip_extractor.extractImplWriteError", { filePath: src }));
        }
      }
    } finally {
      await reader.close();
    }
  }
}
