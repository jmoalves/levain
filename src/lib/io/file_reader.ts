import * as log from "@std/log";
import * as path from "@std/path";
import { existsSync } from "@std/fs";

import ProgressBar from "@deno-library/progress";

import ProgressReader from "./progress_reader.ts";

export default class FileReader implements ProgressReader {
  private filePath: string;
  private file: Deno.FsFile | undefined;
  private fileInfo: Deno.FileInfo | undefined;

  private bytesRead = 0;

  private pb: ProgressBar | undefined;

  constructor(private filename: string) {
    this.filePath = path.resolve(filename);

    if (!existsSync(this.filePath)) {
      throw Error(`File ${this.filePath} does not exist`);
    }

    this.fileInfo = Deno.statSync(this.filePath);
  }

  get name(): string {
    return this.filePath;
  }

  // Progress
  get progressBar(): ProgressBar | undefined {
    return this.pb;
  }

  set progressBar(pb: ProgressBar | undefined) {
    this.pb = pb;
  }

  get title(): string | undefined {
    return "- FROM " + path.basename(this.filePath);
  }

  get size(): number | undefined {
    return this.fileInfo?.size;
  }

  set size(filesize: number | undefined) {
    throw Error("Unsupported - Unable to define size in FileReader");
  }

  get bytesCompleted(): number {
    return this.bytesRead;
  }

  // RewindReader
  rewind() {
    this.close();
    log.debug(`Reading ${this.filePath}`);
    this.file = Deno.openSync(this.filePath, { read: true });
    this.fileInfo = Deno.statSync(this.filePath);
    this.bytesRead = 0;
  }

  // Deno.Reader
  // deno-lint-ignore require-await
  async read(p: Uint8Array): Promise<number | null> {
    if (!this.file) {
      return Promise.resolve(null);
    }

    return new Promise((resolve, _reject) => {
      this.file?.read(p).then((size: number | null) => {
        if (size) {
          this.bytesRead += size;
          if (this.progressBar) {
            this.progressBar.render(this.bytesRead);
          }
        }

        resolve(size);
      });
    });
  }

  // deno-lint-ignore require-await
  async close() {
    if (!this.file) {
      return;
    }

    log.debug(`Closing ${this.filePath}`);
    this.file.close();

    this.fileInfo = Deno.statSync(this.filePath);
  }

  // Timestamps
  get motificationTime(): Date | null {
    if (this.fileInfo) {
      return this.fileInfo.mtime;
    }

    return null;
  }
}
