import * as log from "jsr:@std/log";
import * as path from "jsr:@std/path";
import {existsSync} from "jsr:@std/fs";

import Config from '../config.ts';
import ProgressReader from '../io/progress_reader.ts';

import {FileUtils} from './file_utils.ts';
import ReaderFactory from "../io/reader_factory.ts";

export default class FileCache {
    constructor(
        private config: Config,
    ) {
        this.dir = this.config.levainCacheDir
    }

    public readonly dir: string;

    async get(src: string | ProgressReader): Promise<string> {
        let r: ProgressReader | undefined = undefined

        if (typeof src == 'string') {
            r = ReaderFactory.readerFor(src)
        } else {
            r = src
        }

        await r.rewind()

        const filePathInCache = this.cachedFilePath(r.name)
        log.debug(`filePathInCache ${filePathInCache}`);
        if (this.cacheValid(r, filePathInCache)) {
            log.debug(`fromCache ${filePathInCache}`)
            if (r.motificationTime) {
                Deno.utimeSync(filePathInCache, new Date(), r.motificationTime)
            }
            return filePathInCache;
        }

        if (existsSync(filePathInCache)) {
            log.debug(`Cache - invalidate ${filePathInCache}`)
            Deno.removeSync(filePathInCache, {recursive: true})
        }

        return await this.copyToCache(r)
    }

    cachedFilePath(src: string): string {
        // const cacheDir = this.dir
        const noFolderSrc = src.replace(/(?:\/|\\|:)+/g, '_')
        return path.join(this.dir, noFolderSrc)
    }

    cacheValid(src: ProgressReader, cachePath: string): boolean {
        try {
            if (!existsSync(cachePath)) {
                return false;
            }

            let cacheInfo = Deno.statSync(cachePath)
            return this.fileMatch(src, cacheInfo)

        } catch (error) {
            log.debug(`Error: ${error}`)
            return false
        }
    }

    fileMatch(src: ProgressReader, cacheInfo: Deno.FileInfo): boolean {
        // We should check sha256 sum but it would take long...
        if (src.size != cacheInfo.size) {
            log.debug(`Cache - size does not match - ${src.size} != ${cacheInfo.size}`)
            return false
        }

        if (src.motificationTime?.getTime() != cacheInfo.mtime?.getTime()) {
            log.debug(`Cache - mtime does not match - ${src.motificationTime?.getTime()} != ${cacheInfo.mtime?.getTime()}`)
            return false
        }

        return true
    }

    async copyToCache(src: ProgressReader): Promise<string> {
        log.debug(`- COPY TO CACHE ${src.name}`);
        const filePathInCache = this.cachedFilePath(src.name)
        await FileUtils.copyWithProgress(src, filePathInCache);
        return filePathInCache
    }
}
