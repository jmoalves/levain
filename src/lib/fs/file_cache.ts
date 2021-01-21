import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {existsSync} from "https://deno.land/std/fs/mod.ts";

import Config from '../config.ts';
import ProgressReader from '../io/progress_reader.ts';
import FileReader from '../io/file_reader.ts';

import { FileUtils } from './file_utils.ts';

export default class FileCache {
    constructor(
        private config: Config,
    ) {
        this.dir = this.config.levainCacheDir
    }

    public readonly dir: string;

    async get(src: string | ProgressReader ): Promise<string> {
        let r:ProgressReader | undefined = undefined

        if (typeof src == 'string') {
            r = new FileReader(src)
        } else {
            r = src
        }

        const filePathInCache = this.cachedFilePath(r.name)
        log.debug(`filePathInCache ${filePathInCache}`);
        if (this.cacheValid(r.name, filePathInCache)) {
            log.info(`fromCache ${filePathInCache}`)
            return filePathInCache;
        }

        if (existsSync(filePathInCache)) {
            log.info(`Cache - invalidate ${filePathInCache}`)
            Deno.removeSync(filePathInCache, { recursive: true })
        }

        return await this.copyToCache(r)
    }

    cachedFilePath(src: string): string {
        // const cacheDir = this.dir
        const noFolderSrc = src.replace(/(?:\/|\\|:)+/g, '_')
        return path.join(this.dir, noFolderSrc)
    }

    cacheValid(srcPath: string, cachePath: string): boolean {
        try {
            if (!existsSync(cachePath)) {
                return false;
            }

            let srcInfo = Deno.statSync(srcPath)
            let cacheInfo = Deno.statSync(cachePath)
            if (!srcInfo.isFile || !cacheInfo.isFile) {
                return false
            }

            return this.fileMatch(srcInfo, cacheInfo)

        } catch (error) {
            log.debug(`Error: ${error}`)
            return false
        }
    }

    fileMatch(srcInfo: Deno.FileInfo, cacheInfo: Deno.FileInfo): boolean {
        // We should check sha256 sum but it would take long...
        if (srcInfo.size != cacheInfo.size ) {
            log.info(`Cache - size does not match`)
            return false
        }

        if (srcInfo.mtime?.getTime() != cacheInfo.mtime?.getTime()) {
            log.info(`Cache - mtime does not match`)
            return false
        }

        return true
    }

    async copyToCache(src: ProgressReader): Promise<string> {
        log.info(`- COPY TO CACHE ${src.name}`);
        const filePathInCache = this.cachedFilePath(src.name)
        await FileUtils.copyWithProgress(src, filePathInCache);
        return filePathInCache
    }
}
