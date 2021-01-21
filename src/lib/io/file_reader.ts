import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

import ProgressBar from "https://deno.land/x/progress@v1.1.4/mod.ts";
import { existsSync } from "https://deno.land/std@0.82.0/fs/exists.ts";

import ProgressReader from "./progress_reader.ts";

export default class FileReader implements ProgressReader {
    private filePath: string;
    private file: Deno.File | undefined;
    private fileInfo: Deno.FileInfo | undefined;

    private bytesRead: number = 0;

    private pb: ProgressBar | undefined;

    constructor(private filename: string) {
        this.filePath = path.resolve(filename)

        if (!existsSync(this.filePath)) {
            throw Error(`File ${this.filePath} does not exist`)
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
        return "- FROM " + path.basename(this.filePath)
    }

    get size(): number | undefined {
        return this.fileInfo?.size
    }

    set size(filesize: number | undefined) {
        throw Error('Unsupported - Unable to define size in FileReader')
    }

    get bytesCompleted(): number {
        return this.bytesRead
    }

    // RewindReader
    rewind() {
        this.close()

        log.debug(`Reading ${this.filePath}`)
        this.file = Deno.openSync(this.filePath, {read: true})
        this.fileInfo = Deno.statSync(this.filePath)
        this.bytesRead = 0
    }

    // Deno.Reader
    async read(p: Uint8Array): Promise<number | null> {
        if (!this.file) {
            return Promise.resolve(null)
        }

        return new Promise((resolve, reject) => {
            this.file?.read(p).then(size => {
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
        if (!this.file) {
            return
        }

        log.debug(`Closing ${this.filePath}`)
        this.file.close()
        this.file = undefined

        this.fileInfo = Deno.statSync(this.filePath)
    }

    // Timestamps
    get motificationTime(): Date | null {
        if (this.fileInfo) {
            return this.fileInfo.mtime
        }

        return null
    }
}
