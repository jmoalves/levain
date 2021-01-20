import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import { ensureDirSync } from "https://deno.land/std/fs/ensure_dir.ts";
import { existsSync } from "https://deno.land/std/fs/exists.ts";

import ProgressBar from "https://deno.land/x/progress@v1.1.4/mod.ts";

import Progress from "./progress.ts";
import Timestamps from "./timestamps.ts";

export default class FileWriter implements Deno.Writer, Progress, Timestamps, Deno.Closer {
    private filePath: string
    private file: Deno.File
    private fileInfo: Deno.FileInfo | undefined
    private fileSize: number | undefined

    private written: number = 0

    private pb: ProgressBar | undefined

    constructor(filename: string) {
        this.filePath = path.resolve(filename)

        if (existsSync(this.filePath)) {
            log.debug(`Removing ${this.filePath}`)
            Deno.removeSync(this.filePath)
        }

        const dstDir = path.dirname(this.filePath)
        ensureDirSync(dstDir)

        log.debug(`Writing to ${this.filePath}`)
        this.file = Deno.openSync(this.filePath, {write: true, createNew: true});
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
        if (this.fileInfo) {
            return this.fileInfo.size
        }

        return this.fileSize
    }

    set size(fileSize: number | undefined) {
        this.fileSize = fileSize;
    }

    get bytesCompleted(): number {
        return this.written
    }

    // Deno.Writer
    async write(p: Uint8Array): Promise<number> {
        return new Promise((resolve, reject) => {
            this.file.write(p).then(size => {
                this.written += size;
                if (this.progressBar) {
                    this.progressBar.render(this.written);
                }

                resolve(size);
            })
        });
    }

    async close() {
        log.debug(`Closing ${this.filePath}`)
        this.file.close()

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
