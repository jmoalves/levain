import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import { readerFromStreamReader } from "https://deno.land/std/io/streams.ts";

import ProgressBar from "https://deno.land/x/progress@v1.2.4/mod.ts";

import HttpUtils from '../utils/http_utils.ts';
import ProgressReader from "../io/progress_reader.ts";

export default class HttpReader implements ProgressReader {
    private reader: Deno.Reader | null = null

    private contentLength: number|undefined
    private lastModified: Date|null = null
    private bytesRead: number = 0

    private pb: ProgressBar | undefined

    constructor(private url: string) {
    }

    get name(): string {
        return this.url
    }

    // Progress
    get progressBar(): ProgressBar | undefined {
        return this.pb;
    }

    set progressBar(pb: ProgressBar | undefined) {
        this.pb = pb;
    }

    get title(): string | undefined {
        return "- HTTP " + path.basename(this.url)
    }

    get size(): number | undefined {
        return this.contentLength
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

        let response = await HttpUtils.get(this.url)

        this.contentLength = Number(response.headers.get('content-length')) || undefined
        log.debug(`size: ${this.contentLength} - ${this.url}`)

        this.lastModified = null
        let strDate = response.headers.get('last-modified')
        log.debug(`mtime: ${strDate} - ${this.url}`)

        if (strDate) {
            this.lastModified = new Date(strDate)
        }

        let stream = await response.body
        if (stream) {
            this.reader = readerFromStreamReader(stream.getReader())
        }
    }

    // Deno.Reader
    async read(p: Uint8Array): Promise<number | null> {
        if (!this.reader) {
            log.debug(`- reader null`)
            return Promise.resolve(null)
        }

        // log.debug(`- pre-read ${p.length}`)
        return new Promise((resolve, reject) => {
            this.reader?.read(p).then(size => {
                // log.debug(`- read ${size}`)
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
        return this.lastModified
    }
}
