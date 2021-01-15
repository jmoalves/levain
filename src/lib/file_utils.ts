import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {ensureDirSync, existsSync,} from "https://deno.land/std/fs/mod.ts";
import OsUtils from './os_utils.ts';
import DateUtils from './date_utils.ts';

import ProgressBar from "https://deno.land/x/progress@v1.1.4/mod.ts";

export default class FileUtils {

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

    static async copyWithProgress(srcFile: string, dstFile: string) {
        let tries = 0

        while (tries < 3) {
            tries++

            try {
                const resolvedSrc = path.resolve(srcFile)
                log.debug(`${tries} - reading ${resolvedSrc}`)
                let r = new FileReader(resolvedSrc);
        
                const resolvedDst = path.resolve(dstFile)
                const dstDir = path.dirname(resolvedDst)

                if (existsSync(resolvedDst)) {
                    log.debug(`${tries} - removing ${resolvedDst}`)
                    Deno.removeSync(resolvedDst)
                }

                ensureDirSync(dstDir)
                log.debug(`${tries} - writing to ${resolvedDst}`)
                let w = new FileWriter(resolvedDst, r.progressbar);
        
                let size = await Deno.copy(r, w);

                log.debug(`${tries} - closing ${resolvedSrc}`)
                await r.close();

                log.debug(`${tries} - closing ${resolvedDst}`)
                await w.close();

                const srcInfo = Deno.statSync(resolvedSrc);
                const dstInfo = Deno.statSync(resolvedDst);

                // Check size
                if (srcInfo.size != dstInfo.size) {
                    throw Error(`Copy size does not match ${dstInfo.size} != ${srcInfo.size}`)
                }
                log.debug(`Size ok for ${resolvedDst}`)

                // Preserve timestamps
                if (srcInfo.atime instanceof Date && srcInfo.mtime instanceof Date) {
                    Deno.utimeSync(dstFile, srcInfo.atime, srcInfo.mtime)
                    log.debug(`Timestamps preserved - ${resolvedDst}`)
                } else {
                    log.error(`Could not preserve timestamps - ${resolvedDst}`)
                }

                return;
            } catch (error) {
                log.info("")
                log.error(`Error ${error}`)
            }
        }

        throw Error(`Unable to copy ${srcFile} to ${dstFile}`)
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

class FileReader implements Deno.Reader {
    private file: Deno.File;
    private fileInfo: Deno.FileInfo;

    private pb: ProgressBar;

    constructor(private filePath: string) {
        if (!existsSync(filePath)) {
            throw `File ${filePath} does not exist`;
        }

        this.file = Deno.openSync(filePath, {read: true});
        this.fileInfo = Deno.statSync(filePath);
        const title = "- COPY " + path.basename(filePath);
        const total = this.fileInfo.size;
        this.pb = new ProgressBar({
            title,
            total,
            complete: "=",
            incomplete: "-"
        });
    }

    get progressbar(): ProgressBar {
        return this.pb;
    }

    async read(p: Uint8Array): Promise<number | null> {
        return this.file.read(p);
    }

    async close() {
        this.file.close();
    }
}

class FileWriter implements Deno.Writer {
    private file: Deno.File;
    private written: number = 0;

    constructor(filePath: string, private progress?: ProgressBar) {
        this.file = Deno.openSync(filePath, {write: true, createNew: true});
    }

    async write(p: Uint8Array): Promise<number> {
        return new Promise((resolve, reject) => {
            this.file.write(p).then(size => {
                this.written += size;
                if (this.progress) {
                    this.progress.render(this.written);
                }

                resolve(size);
            })
        });
    }

    async close() {
        this.file.close();
    }
}
