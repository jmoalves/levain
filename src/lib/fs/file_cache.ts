import * as log from "@std/log";
import * as path from "@std/path";
import { ensureDirSync, existsSync } from "@std/fs";

import type Config from "../config.ts";
import type ProgressReader from "../io/progress_reader.ts";

import { FileUtils } from "./file_utils.ts";
import ReaderFactory from "../io/reader_factory.ts";
import OsUtils from "../os/os_utils.ts";
import { FileProgress } from "../io/file_progress.ts";

export default class FileCache {
  constructor(
    private config: Config,
  ) {
    this.dir = this.config.configPaths.levainCacheDir;
  }

  public readonly dir: string;

  async get(src: string | ProgressReader): Promise<string> {
    let r: ProgressReader | undefined = undefined;

    if (typeof src == "string") {
      r = ReaderFactory.readerFor(src);
    } else {
      r = src;
    }

    await r.rewind();

    try {
      const filePathInCache = this.cachedFilePath(r.name);
      log.debug(`filePathInCache ${filePathInCache}`);
      if (this.cacheValid(r, filePathInCache)) {
        log.debug(`fromCache ${filePathInCache}`);
        if (r.motificationTime) {
          try {
            Deno.utimeSync(filePathInCache, new Date(), r.motificationTime);
          } catch (err) {
            log.debug(`Could not touch cached file ${filePathInCache}: ${err}`);
          }
        }
        await r.close();
        return filePathInCache;
      }

      // Only remove unexpected directories at the target path; regular files are
      // replaced atomically by FileWriter.close() so concurrent readers stay safe.
      if (existsSync(filePathInCache) && FileUtils.isDir(filePathInCache)) {
        OsUtils.removeDir(filePathInCache);
        log.debug(`Cache - removed conflicting directory ${filePathInCache}`);
      }

      return await this.copyToCache(r, true);
    } catch (error) {
      try {
        await r.close();
      } catch {
        // ignore cleanup errors
      }
      throw error;
    }
  }

  cachedFilePath(src: string): string {
    // const cacheDir = this.dir
    const noFolderSrc = src.replace(/(?:\/|\\|:)+/g, "_");
    return path.join(this.dir, noFolderSrc);
  }

  cacheValid(src: ProgressReader, cachePath: string): boolean {
    try {
      if (!existsSync(cachePath)) {
        return false;
      }

      const cacheInfo = FileUtils.getFileInfoSync(cachePath);
      return this.fileMatch(src, cacheInfo);
    } catch (error) {
      log.debug(`Error: ${error}`);
      return false;
    }
  }

  fileMatch(src: ProgressReader, cacheInfo: Deno.FileInfo): boolean {
    // We should check sha256 sum but it would take long...
    if (src.size != cacheInfo.size) {
      log.debug(`Cache - size does not match - ${src.size} != ${cacheInfo.size}`);
      return false;
    }

    if (src.motificationTime?.getTime() != cacheInfo.mtime?.getTime()) {
      log.debug(`Cache - mtime does not match - ${src.motificationTime?.getTime()} != ${cacheInfo.mtime?.getTime()}`);
      return false;
    }

    return true;
  }

  async copyToCache(src: ProgressReader, alreadyRewound = false): Promise<string> {
    log.debug(`- COPY TO CACHE ${src.name}`);
    ensureDirSync(this.dir);
    const filePathInCache = this.cachedFilePath(src.name);
    try {
      await FileProgress.copyWithProgress(src, filePathInCache, alreadyRewound);
    } catch (err) {
      // If another concurrent Levain instance populated the exact same cache file while
      // we were downloading, reuse the valid cached copy instead of failing.
      if (this.cacheValid(src, filePathInCache)) {
        log.debug(`Cache populated concurrently by another instance: ${filePathInCache}`);
        return filePathInCache;
      }
      throw err;
    }
    return filePathInCache;
  }
}
