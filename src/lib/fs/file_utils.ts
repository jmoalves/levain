import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {existsSync} from "https://deno.land/std/fs/mod.ts";

import ProgressBar from "https://deno.land/x/progress@v1.1.4/mod.ts";

import OsUtils from '../os/os_utils.ts';
import DateUtils from '../utils/date_utils.ts';
import FileReader from '../io/file_reader.ts';
import FileWriter from '../io/file_writer.ts';
import ProgressReader from '../io/progress_reader.ts';

export class FileUtils {
    static getModificationTimestamp(filePath: string): Date | undefined {
        const stat = this.getFileInfoSync(filePath);
        const modificationTimestamp = stat.mtime;
        log.debug(`getModificationTimestamp ${modificationTimestamp} --> ${filePath}`);
        return modificationTimestamp || undefined;
    }

    static getFileInfoSync(filePath: string): Deno.FileInfo {
        const stat = Deno.statSync(filePath);
        return stat;
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
                if (e.name != 'PermissionDenied') {
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
        const hasPermission = !!(mode & bitwisePermission)
        return hasPermission
    }

    static waitForFilesToClose() {
        while (this.getFileResources().length > 0) {
            console.debug(`Waiting for Deno.resources to close ${JSON.stringify(Deno.resources())}`)
        }
    }

    static getFileResources(): [string, any][] {
        const resourceMap = Deno.resources()
        const resourceArray = Object.entries(resourceMap)
        const fileResources = resourceArray.filter(
            it => it[1].toString() === 'fsFile'
        )
        return fileResources
    }

    static isDir(filePath: string) {
        const fileInfo = this.getFileInfoSync(filePath);
        return fileInfo.isDirectory
    }

    static isFile(filePath: string) {
        const fileInfo = this.getFileInfoSync(filePath);
        return fileInfo.isFile
    }

    static resolve(parent: string|undefined, url: string): string {
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

    static isFileSystemUrl(url: string|undefined) : boolean {
        if (!url) {
            return false
        }

        if (url.startsWith("http://") || url.startsWith("https://")) {
            return false
        }

        if (url.match(/.*@.*:.*\/.*\.git/)) {
            return false
        }

        return true
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
        let r:ProgressReader | undefined = undefined

        if (typeof src == 'string') {
            r = new FileReader(src)
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
        
                let title = r.title;
                let total = r.size;

                if (total) {
                    let pb = new ProgressBar({
                        title,
                        total,
                        complete: "=",
                        incomplete: "-"
                    });
    
                    dst.size = r.size;
                    dst.progressBar = pb;    
                }
                
                await Deno.copy(r, dst);

                await r.close();
                await dst.close();

                // Check size
                if (r.size && dst.size && r.size != dst.size) {
                    throw Error(`Copy size does not match ${r.size} => ${dst.size}`)
                }
                log.debug(`Size ok for ${dstFile}`)

                // Preserve timestamps
                if (r.motificationTime instanceof Date && dst.motificationTime instanceof Date) {
                    Deno.utimeSync(dstFile, r.motificationTime, r.motificationTime)
                    log.debug(`Timestamps preserved - ${dstFile}`)
                } else {
                    log.error(`Could not preserve timestamps - ${dstFile}`)
                }

                return;
            } catch (error) {
                log.info("")
                log.error(`Error ${error}`)
            }
        }

        throw Error(`Unable to copy to ${dstFile}`)
    }

    static getSize(path: string) {
        const stat = Deno.statSync(path)
        const size = stat.size
        return size
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

        Deno.copyFileSync(filename, bkp);
        return bkp;
    }

    static exists(path: string): boolean {
        return existsSync(path);
    }
}
