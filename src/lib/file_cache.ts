import Config from './config.ts';
import FileUtils from './file_utils.ts';
import {existsSync} from "https://deno.land/std/fs/mod.ts";
import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";

export default class FileCache {
    constructor(
        private config: Config,
    ) {
        this.dir = this.config.levainCacheDir
    }

    public readonly dir: string;

    async get(filePath: string): Promise<string> {
        const filePathInCache = this.cachedFilePath(filePath)
        log.debug(`filePathInCache ${filePathInCache}`);
        if (existsSync(filePathInCache)) {
            log.info(`fromCache ${filePathInCache}`)
            return filePathInCache;
        } else {
            return await this.copyToCache(filePath)
        }
    }

    cachedFilePath(src: string): string {
        const cacheDir = this.dir
        const noFolderSrc = src.replace(/(?:\/|\\)/g, '_')
        return path.join(cacheDir, noFolderSrc)
    }

    async copyToCache(src: string): Promise<string> {
        log.info(`- COPY TO CACHE ${src}`);
        const filePathInCache = this.cachedFilePath(src)
        await FileUtils.copyWithProgress(src, filePathInCache);
        return filePathInCache
    }
}
