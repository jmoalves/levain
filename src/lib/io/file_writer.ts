import * as log from "@std/log";
import * as path from "@std/path";
import { ensureDirSync } from "@std/fs";

import ProgressBar from "@deno-library/progress";
import { type Closer, type Writer } from "@std/io";

import t from "../i18n.ts";
import { fileError } from "../utils/error_utils.ts";
import type Progress from "./progress.ts";
import type Timestamps from "./timestamps.ts";
import { FileUtils } from "../fs/file_utils.ts";
import OsUtils from "../os/os_utils.ts";

export default class FileWriter implements Writer, Progress, Timestamps, Closer {
  private filePath: string;
  private tempPath: string;
  private file: Deno.FsFile;
  private closed = false;
  private fileInfo: Deno.FileInfo | undefined;
  private fileSize: number | undefined;

  private written = 0;

  private pb: ProgressBar | undefined;

  constructor(filename: string) {
    this.filePath = path.resolve(filename);

    const dstDir = path.dirname(this.filePath);
    ensureDirSync(dstDir);

    try {
      this.tempPath = Deno.makeTempFileSync({ dir: dstDir, prefix: "levain-temp-" });
      log.debug(`Writing to ${this.tempPath}`);
      this.file = Deno.openSync(this.tempPath, { write: true, create: true, truncate: true });
    } catch (err) {
      throw fileError(err, dstDir, t("lib.io.file_writer.constructorError"));
    }
  }

  // Progress
  get progressBar(): ProgressBar | undefined {
    return this.pb;
  }

  set progressBar(pb: ProgressBar | undefined) {
    this.pb = pb;
  }

  get title(): string | undefined {
    return "- TO " + path.basename(this.filePath);
  }

  get size(): number | undefined {
    if (this.fileInfo) {
      return this.fileInfo.size;
    }

    return this.fileSize;
  }

  set size(fileSize: number | undefined) {
    this.fileSize = fileSize;
  }

  get bytesCompleted(): number {
    return this.written;
  }

  // Deno.Writer
  async write(p: Uint8Array): Promise<number> {
    const size = await this.file.write(p);
    this.written += size;
    if (this.progressBar) {
      await this.progressBar.render(this.written);
    }
    return size;
  }

  // deno-lint-ignore require-await
  async close(options?: { expectedSize?: number; mtime?: Date | null }) {
    log.debug(`Closing ${this.tempPath}`);
    if (!this.closed) {
      this.closed = true;
      this.file.close();
    }

    try {
      const tempInfo = FileUtils.getFileInfoSync(this.tempPath);
      if (options?.expectedSize && tempInfo.size !== options.expectedSize) {
        throw new Error(`Copy size does not match ${options.expectedSize} => ${tempInfo.size}`);
      }

      if (options?.mtime instanceof Date) {
        try {
          Deno.utimeSync(this.tempPath, new Date(), options.mtime);
          log.debug(`Timestamps preserved - ${this.tempPath}`);
        } catch (err) {
          log.debug(`Could not preserve timestamps on ${this.tempPath}: ${err}`);
        }
      }

      log.debug(`Moving ${this.tempPath} => ${this.filePath}`);
      FileUtils.renameSync(this.tempPath, this.filePath);
      this.fileInfo = FileUtils.getFileInfoSync(this.filePath);
    } catch (err) {
      try {
        OsUtils.removeFile(this.tempPath);
      } catch {
        // ignore temp cleanup error
      }
      throw err;
    }
  }

  abort() {
    if (!this.closed) {
      this.closed = true;
      try {
        this.file.close();
      } catch {
        // ignore close error on abort
      }
    }
    try {
      OsUtils.removeFile(this.tempPath);
    } catch {
      // ignore temp cleanup error on abort
    }
  }

  // Timestamps
  get modificationTime(): Date | null {
    if (this.fileInfo) {
      return this.fileInfo.mtime;
    }

    return null;
  }
}
