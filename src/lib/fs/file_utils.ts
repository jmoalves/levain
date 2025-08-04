import * as log from "jsr:@std/log";
import * as path from "jsr:@std/path";
import {copySync, ensureDirSync, existsSync} from "jsr:@std/fs";
import { copy } from "jsr:@std/io";

import ProgressBar from "https://deno.land/x/progress/mod.ts";

import OsUtils from '../os/os_utils.ts';
import DateUtils from '../utils/date_utils.ts';
import FileWriter from '../io/file_writer.ts';
import ProgressReader from '../io/progress_reader.ts';
import ReaderFactory from "../io/reader_factory.ts";
import StringUtils from "../utils/string_utils.ts";
import ConsoleFeedback from "../utils/console_feedback.ts";

export class FileUtils {
    static getModificationTimestamp(filePath: string): Date | undefined {
        const stat = this.getFileInfoSync(filePath);
        const modificationTimestamp = stat.mtime;
        log.debug(`getModificationTimestamp ${modificationTimestamp} --> ${filePath}`);
        return modificationTimestamp || undefined;
    }

    static getFileInfoSync(filePath: string): Deno.FileInfo {
        return Deno.statSync(filePath);
    }

    static canReadSync(filePath: string) {
        // FIXME Will not need the following code block when Deno.statSync.mode is fully implemented for Windows
        if (OsUtils.isWindows()) {
            try {
                if (!existsSync(filePath)) {
                    return false
                }
                // const fileInfo = this.getFileInfoSync(filePath)
                // if (fileInfo.isFile) {
                //     const file = Deno.openSync(filePath)
                //     file.close()
                // } else {
                //     Deno.readDirSync(filePath)
                // }
                return true
            } catch (e) {
                if (!(e instanceof Deno.errors.PermissionDenied)) {
                    log.debug(`Error reading ${filePath}`)
                }
                return false
            }
        }

        const bitwisePermission = 0b100_000_000;
        return this.checkBitwisePermission(filePath, bitwisePermission);
    }

    static canWriteSync(filePath: string) {
        if (OsUtils.isWindows()) {
            if (FileUtils.isDir(filePath)) {
                return FileUtils.canCreateTempFileInDir(filePath)
            }
            throw 'How do I check if a file is writable in Windows?'
        }
        const bitwisePermission = 0b010_000_000;
        return this.checkBitwisePermission(filePath, bitwisePermission);
    }

    private static checkBitwisePermission(filePath: string, bitwisePermission: number) {
        if (!existsSync(filePath)) {
            return false
        }
        const fileInfo = this.getFileInfoSync(filePath);
        if (OsUtils.isWindows()) {
            if (fileInfo !== undefined) {
                throw 'Please check https://doc.deno.land/builtin/stable#Deno.FileInfo . Is Deno.statSync.mode is implemented for Windows?\n'
            }
            throw 'How do I check file/folder permissions in Windows? https://doc.deno.land/builtin/stable#Deno.FileInfo'
        }

        const mode = fileInfo.mode || 0;
        return !!(mode & bitwisePermission)
    }

    static isDir(filePath: string) {
        const fileInfo = this.getFileInfoSync(filePath);
        return fileInfo.isDirectory
    }

    static isFile(filePath: string) {
        const fileInfo = this.getFileInfoSync(filePath);
        return fileInfo.isFile
    }

    static resolve(parent: string | undefined, url: string): string {
        if (!FileUtils.isFileSystemUrl(url)) {
            return url
        }

        if (parent) {
            url = path.resolve(parent, url)
        } else {
            url = path.resolve(url)
        }

        return url
    }

    static isFileSystemUrl(url: string | undefined): boolean {
        if (!url) {
            return false
        }

        if (url.startsWith("http://") || url.startsWith("https://")) {
            return false
        }

        return !url.match(/.*@.*:.*\/.*\.git/);
    }

    static canCreateTempFileInDir(dir: string): boolean {
        try {
            const options = {
                dir,
                prefix: 'test-can-write'
            };
            const tempFile = Deno.makeTempFileSync(options);
            Deno.removeSync(tempFile)
            return true
        } catch (error) {
            log.debug(`Cannot create a file in ${dir}`)
            log.debug(error)
            return false
        }
    }

    static async copyWithProgress(src: string | ProgressReader, dstFile: string) {
        let r: ProgressReader | undefined

        if (typeof src == 'string') {
            r = ReaderFactory.readerFor(src)
        } else {
            r = src
        }

        if (!r) {
            throw Error(`Reader undefined`)
        }

        let tries = 0
        while (tries < 3) {
            tries++

            try {
                await r.rewind();
                let dst = new FileWriter(dstFile);

                let title = r.title ? StringUtils.compressText(r.title, 50) : undefined;
                let total = r.size;

                if (total) {
                    let pb = new ProgressBar({
                            title,
                            total,
                            complete: "=",
                            incomplete: "-",
                            display: ":title :percent :bar ETA :eta (:time)",
                            interval: Deno.stdout.isTerminal() ? ConsoleFeedback.MIN_INTERVAL_MS : 30*1000 // ms
                        })

                    dst.size = r.size;
                    dst.progressBar = pb;
                }

                await copy(r, dst);

                await r.close();
                await dst.close();

                // Check size
                if (r.size && dst.size && r.size != dst.size) {
                    throw Error(`Copy size does not match ${r.size} => ${dst.size}`)
                }
                log.debug(`Size ok for ${dstFile}`)

                // Preserve timestamps
                if (r.motificationTime instanceof Date && dst.motificationTime instanceof Date) {
                    Deno.utimeSync(dstFile, new Date(), r.motificationTime)
                    log.debug(`Timestamps preserved - ${dstFile}`)
                } else {
                    log.debug(`Could not preserve timestamps - ${dstFile}`)
                }

                // Workaround - let console flush after progress bar
                await new Promise(r => setTimeout(r, 0))

                return;
            } catch (error) {
                log.debug("")
                log.debug(`Error ${error}`)
            }
        }

        throw Error(`Unable to copy to ${dstFile}`)
    }

    static getSize(path: string) {
        const stat = Deno.statSync(path)
        return stat.size
    }

    static throwIfNotExists(filePath: string) {
        if (!existsSync(filePath)) {
            throw new Deno.errors.NotFound(`File ${filePath} does not exist`)
        }
    }

    static createBackup(filename: string): string | undefined {
        if (!existsSync(filename)) {
            return undefined;
        }

        let now = new Date();
        let bkp = "";

        do
            bkp = filename + "." + DateUtils.dateTag(now) + "." + DateUtils.timeTagWithMillis('', now) + ".bkp";
        while (existsSync(bkp))

        copySync(filename, bkp);
        return bkp;
    }

    static exists(path: string): boolean {
        return existsSync(path);
    }

    static ensureDirSync(fileUri: string) {
        try {
            ensureDirSync(fileUri)
        } catch (err) {
            console.error(`Error with ${fileUri}`)
            throw err
        }
    }

    static async createEmptyFile(filePath: string): Promise<void> {
        await Deno.writeTextFile(filePath, "");
    }

}
