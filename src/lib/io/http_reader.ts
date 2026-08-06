import * as log from "@std/log";
import * as path from "@std/path";
import ProgressBar from "@deno-library/progress";


import HttpUtils from "../utils/http_utils.ts";
import ProgressReader from "../io/progress_reader.ts";

export default class HttpReader implements ProgressReader {
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private pending: Uint8Array<ArrayBufferLike> = new Uint8Array(0);

  private contentLength: number | undefined;
  private lastModified: Date | null = null;
  private bytesRead: number = 0;

  private pb: ProgressBar | undefined;

  constructor(private url: string) {
  }

  get name(): string {
    return this.url;
  }

  // Progress
  get progressBar(): ProgressBar | undefined {
    return this.pb;
  }

  set progressBar(pb: ProgressBar | undefined) {
    this.pb = pb;
  }

  get title(): string | undefined {
    return "- HTTP " + path.basename(this.url);
  }

  get size(): number | undefined {
    return this.contentLength;
  }

  set size(filesize: number | undefined) {
    throw Error("Unsupported - Unable to define size in HttpReader");
  }

  get bytesCompleted(): number {
    return this.bytesRead;
  }

  // RewindReader
  async rewind() {
    this.close();
    log.debug(`Reading ${this.url}`);
    this.bytesRead = 0;

    const response = await HttpUtils.get(this.url);

    this.contentLength = Number(response.headers.get("content-length")) || undefined;
    log.debug(`size: ${this.contentLength} - ${this.url}`);

    this.lastModified = null;
    const strDate = response.headers.get("last-modified");
    log.debug(`mtime: ${strDate} - ${this.url}`);

    if (strDate) {
      this.lastModified = new Date(strDate);
    }

    const stream = response.body;
    if (stream) {
      this.reader = stream.getReader();
    }
  }

  // Deno.Reader
  async read(p: Uint8Array): Promise<number | null> {
    if (!this.reader) {
      log.debug(`- reader null`);
      return null;
    }

    while (this.pending.length === 0) {
      const { value, done } = await this.reader.read();

      if (done) {
        return null;
      }

      this.pending = value;
    }

    const n = Math.min(p.length, this.pending.length);

    p.set(this.pending.subarray(0, n));

    this.pending = this.pending.subarray(n);

    this.bytesRead += n;
    await this.progressBar?.render(this.bytesRead);

    return n;
  }

  async close() {
    if (!this.reader) {
      return;
    }

    log.debug(`Closing ${this.url}`);
    await this.reader.cancel();
    this.reader.releaseLock();

    this.reader = null;
    this.pending = new Uint8Array(0);
  }

  // Timestamps
  get motificationTime(): Date | null {
    return this.lastModified;
  }
}
