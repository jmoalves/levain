import * as log from "@std/log";
import * as zip from "@zip.js/zip.js";

import type Config from "../config.ts";
import { Extractor } from "./extractor.ts";
import { fileError } from "../utils/error_utils.ts";
import t from "../i18n.ts";

export class DenoZip extends Extractor {
  constructor(config: Config) {
    super(config);
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

    const entries = await reader.getEntries();

    for (const entry of entries) {
      if (!entry.filename) continue;

      // Match includeFileName: false from deno.land/x/zip
      const outputPath = `${dst}/${entry.filename}`;

      if (entry.directory) {
        await Deno.mkdir(outputPath, { recursive: true });
        continue;
      }

      await Deno.mkdir(outputPath.substring(0, outputPath.lastIndexOf("/")), {
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

    await reader.close();
  }
}
