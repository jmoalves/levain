import * as log from "@std/log";
import { copy } from "@std/io";
import ProgressBar from "@deno-library/progress";

import StringUtils from "../utils/string_utils.ts";
import FileWriter from "./file_writer.ts";
import type ProgressReader from "./progress_reader.ts";
import ReaderFactory from "./reader_factory.ts";
import ConsoleFeedback from "../utils/console_feedback.ts";

export class FileProgress {
  static async copyWithProgress(src: string | ProgressReader, dstFile: string) {
    let r: ProgressReader | undefined;

    if (typeof src == "string") {
      r = ReaderFactory.readerFor(src);
    } else {
      r = src;
    }

    if (!r) {
      throw Error(`Reader undefined`);
    }

    let tries = 0;
    while (tries < 3) {
      tries++;

      try {
        await r.rewind();
        const dst = new FileWriter(dstFile);

        const title = r.title ? StringUtils.compressText(r.title, 50) : undefined;
        const total = r.size;

        if (total) {
          const pb = new ProgressBar({
            title,
            total,
            complete: "=",
            incomplete: "-",
            display: ":title :percent :bar ETA :eta (:time)",
            interval: Deno.stdout.isTerminal() ? ConsoleFeedback.MIN_INTERVAL_MS : 30 * 1000, // ms
          });

          dst.size = r.size;
          dst.progressBar = pb;
        }

        await copy(r, dst);

        await r.close()
        await dst.close()

        if (r.size && dst.size && r.size != dst.size) {
          throw Error(`Copy size does not match ${r.size} => ${dst.size}`);
        }
        log.debug(`Size ok for ${dstFile}`);

        // Preserve timestamps
        if (r.motificationTime instanceof Date && dst.motificationTime instanceof Date) {
          Deno.utimeSync(dstFile, new Date(), r.motificationTime);
          log.debug(`Timestamps preserved - ${dstFile}`);
        } else {
          log.debug(`Could not preserve timestamps - ${dstFile}`);
        }

        // Workaround - let console flush after progress bar
        await new Promise((r) => setTimeout(r, 0));

        return;
      } catch (error) {
        log.debug("");
        log.debug(`Error ${error}`);
      }
    }

    throw Error(`Unable to copy to ${dstFile}`);
  }
}
