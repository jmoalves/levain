import * as log from "jsr:@std/log";
import * as path from "jsr:@std/path";
import { existsSync, ensureDirSync } from "jsr:@std/fs";

import ProgressBar from "https://deno.land/x/progress/mod.ts";

import Progress from "./progress.ts";
import Timestamps from "./timestamps.ts";

export default class FileWriter implements Deno.Writer, Progress, Timestamps, Deno.Closer {
    private filePath: string
    private tempPath: string
    private file: Deno.FsFile
    private fileInfo: Deno.FileInfo | undefined
    private fileSize: number | undefined

    private written = 0

    private pb: ProgressBar | undefined

    constructor(filename: string) {
        this.filePath = path.resolve(filename)

        const dstDir = path.dirname(this.filePath)
        ensureDirSync(dstDir)

        this.tempPath = Deno.makeTempFileSync({ dir: dstDir, prefix: 'levain-temp-'})

        log.debug(`Writing to ${this.tempPath}`)
        this.file = Deno.openSync(this.tempPath, {write: true, create: true, truncate: true});
    }

    // Progress
    get progressBar(): ProgressBar | undefined {
        return this.pb;
    }

    set progressBar(pb: ProgressBar | undefined) {
        this.pb = pb;
    }

    get title(): string | undefined {
        return "- TO " + path.basename(this.filePath)
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
            this.file.write(p).then((size:number) => {
                this.written += size;
                if (this.progressBar) {
                    this.progressBar.render(this.written);
                }

                resolve(size);
            })
        });
    }

    async close() {
        log.debug(`Closing ${this.tempPath}`)
        this.file.close()

        if (existsSync(this.filePath)) {
            log.debug(`Removing ${this.filePath}`)
            Deno.removeSync(this.filePath)
        }

        log.debug(`Moving ${this.tempPath} => ${this.filePath}`)
        Deno.renameSync(this.tempPath, this.filePath)

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
