import * as log from "https://deno.land/std/log/mod.ts";
import { readerFromStreamReader } from "https://deno.land/std/io/streams.ts";

import ProgressBar from "https://deno.land/x/progress@v1.1.4/mod.ts";

import HttpUtils from '../http_utils.ts';
import Config from "../config.ts";
import { ProgressReader } from "../file_utils.ts";

export default class HttpReader implements ProgressReader {
    private httpUtils: HttpUtils

    private reader: Deno.Reader | null = null
    private bytesRead: number = 0

    private pb: ProgressBar | undefined

    constructor(private config: Config, private url: string) {
        this.httpUtils = new HttpUtils(config)
    }

    // Progress
    get progressBar(): ProgressBar | undefined {
        return this.pb;
    }

    set progressBar(pb: ProgressBar | undefined) {
        this.pb = pb;
    }

    get title(): string | undefined {
        return "- FROM " + this.url
    }

    get size(): number | undefined {
        return undefined
    }

    set size(filesize: number | undefined) {
        throw Error('Unsupported - Unable to define size in HttpReader')
    }

    get bytesCompleted(): number {
        return this.bytesRead
    }

    // RewindReader
    async rewind() {
        this.close()

        log.debug(`Reading ${this.url}`)
        this.bytesRead = 0
        let stream = await this.httpUtils.getStream(this.url)
        if (stream) {
            this.reader = readerFromStreamReader(stream.getReader())
        }
    }

    // Deno.Reader
    async read(p: Uint8Array): Promise<number | null> {
        if (!this.reader) {
            return Promise.resolve(null)
        }

        return new Promise((resolve, reject) => {
            this.reader?.read(p).then(size => {
                if (size) {
                    this.bytesRead += size;
                    if (this.progressBar) {
                        this.progressBar.render(this.bytesRead);
                    }
                }

                resolve(size);
            })
        });
    }

    async close() {
        if (!this.reader) {
            return
        }

        log.debug(`Closing ${this.url}`)
        this.reader = null
    }

    // Timestamps
    get motificationTime(): Date | null { 
        return null
    }
}
