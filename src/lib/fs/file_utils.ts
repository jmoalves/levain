import * as log from "@std/log";
import * as path from "@std/path";
import { ensureDirSync, existsSync } from "@std/fs";
import { copy } from "@std/io";

import ProgressBar from "@deno-library/progress";

import DateUtils from "../utils/date_utils.ts";
import FileWriter from "../io/file_writer.ts";
import ProgressReader from "../io/progress_reader.ts";
import ReaderFactory from "../io/reader_factory.ts";
import StringUtils from "../utils/string_utils.ts";
import ConsoleFeedback from "../utils/console_feedback.ts";

export class FileUtils {
  static getModificationTimestamp(filePath: string): Date | undefined {
    const stat = this.getFileInfoSync(filePath);
    const modificationTimestamp = stat.mtime;
    log.debug(`getModificationTimestamp ${modificationTimestamp} --> ${filePath}`);
    return modificationTimestamp || undefined;
  }

  static getFileInfoSync(filePath: string): Deno.FileInfo {
    return Deno.statSync(filePath);
  }

  static canReadSync(filePath: string) {
    const bitwisePermission = 0b100_000_000;
    return this.checkBitwisePermission(filePath, bitwisePermission);
  }

  static canWriteSync(filePath: string) {
    const bitwisePermission = 0b010_000_000;
    return this.checkBitwisePermission(filePath, bitwisePermission);
  }

  private static checkBitwisePermission(filePath: string, bitwisePermission: number) {
    if (!existsSync(filePath)) {
      return false;
    }
    const fileInfo = this.getFileInfoSync(filePath);
    const mode = fileInfo.mode || 0;
    return !!(mode & bitwisePermission);
  }

  static isDir(filePath: string) {
    const fileInfo = this.getFileInfoSync(filePath);
    return fileInfo.isDirectory;
  }

  static isFile(filePath: string) {
    const fileInfo = this.getFileInfoSync(filePath);
    return fileInfo.isFile;
  }

  static resolve(parent: string | undefined, url: string): string {
    if (!FileUtils.isFileSystemUrl(url)) {
      return url;
    }

    if (parent) {
      url = path.resolve(parent, url);
    } else {
      url = path.resolve(url);
    }

    return url;
  }

  static isFileSystemUrl(url: string | undefined): boolean {
    if (!url) {
      return false;
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
      return false;
    }

    return !url.match(/.*@.*:.*\/.*\.git/);
  }

  static canCreateTempFileInDir(dir: string): boolean {
    try {
      const options = {
        dir,
        prefix: "test-can-write",
      };
      const tempFile = Deno.makeTempFileSync(options);
      Deno.removeSync(tempFile);
      return true;
    } catch (error) {
      log.debug(`Cannot create a file in ${dir}`);
      log.debug(error);
      return false;
    }
  }

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

  static getSize(path: string) {
    const stat = Deno.statSync(path);
    return stat.size;
  }

  static throwIfNotExists(filePath: string) {
    if (!existsSync(filePath)) {
      throw new Deno.errors.NotFound(`File ${filePath} does not exist`);
    }
  }

  static createBackup(filename: string): string | undefined {
    if (!existsSync(filename)) {
      return undefined;
    }

    const now = new Date();
    let bkp = "";

    do bkp = filename + "." + DateUtils.dateTag(now) + "." + DateUtils.timeTagWithMillis("", now) + ".bkp"; while (
      existsSync(bkp)
    );

    Deno.copyFileSync(filename, bkp);
    return bkp;
  }

  static exists(path: string): boolean {
    return existsSync(path);
  }

  static ensureDirSync(fileUri: string) {
    try {
      ensureDirSync(fileUri);
    } catch (err) {
      console.error(`Error with ${fileUri}`);
      throw err;
    }
  }

  static async createEmptyFile(filePath: string): Promise<void> {
    await Deno.writeTextFile(filePath, "");
  }
}
