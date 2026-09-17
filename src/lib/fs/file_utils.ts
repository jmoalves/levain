import * as log from "@std/log";
import * as path from "@std/path";
import { ensureDirSync, existsSync } from "@std/fs";


import t from "../i18n.ts";
import DateUtils from "../utils/date_utils.ts";
import { fileError } from "../utils/error_utils.ts";


export class FileUtils {
  static getModificationTimestamp(filePath: string): Date | undefined {
    const stat = this.getFileInfoSync(filePath);
    const modificationTimestamp = stat.mtime;
    log.debug(`getModificationTimestamp ${modificationTimestamp} --> ${filePath}`);
    return modificationTimestamp || undefined;
  }

  static getFileInfoSync(filePath: string, operationNameOnError:string = t("lib.fs.file_utils.getFileInfoSyncError")): Deno.FileInfo {
    try {
      return Deno.statSync(filePath);
    } catch (err) {
      throw fileError(err, filePath, operationNameOnError);
    }
  }

  static async getFileInfo(filePath: string, operationNameOnError:string = t("lib.fs.file_utils.getFileInfoSyncError")): Promise<Deno.FileInfo> {
    try {
      return await Deno.stat(filePath);
    } catch (err) {
      throw fileError(err, filePath, operationNameOnError);
    }
  }

  static canReadSync(filePath: string) {
    const bitwisePermission = 0b100_000_000;
    return this.checkBitwisePermission(filePath, bitwisePermission);
  }

  static canWriteSync(filePath: string) {
    const bitwisePermission = 0b010_000_000;
    return this.checkBitwisePermission(filePath, bitwisePermission);
  }

  private static checkBitwisePermission(filePath: string, bitwisePermission: number) {
    if (!existsSync(filePath)) {
      return false;
    }
    const fileInfo = this.getFileInfoSync(filePath);
    const mode = fileInfo.mode || 0;
    return !!(mode & bitwisePermission);
  }

  static isDir(filePath: string) {
    const fileInfo = this.getFileInfoSync(filePath);
    return fileInfo.isDirectory;
  }

  static isFile(filePath: string) {
    const fileInfo = this.getFileInfoSync(filePath);
    return fileInfo.isFile;
  }

  static resolve(parent: string | undefined, url: string): string {
    if (!FileUtils.isFileSystemUrl(url)) {
      return url;
    }

    if (parent) {
      url = path.resolve(parent, url);
    } else {
      url = path.resolve(url);
    }

    return url;
  }

  static isFileSystemUrl(url: string | undefined): boolean {
    if (!url) {
      return false;
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
      return false;
    }

    return !url.match(/.*@.*:.*\/.*\.git/);
  }

  static canCreateTempFileInDir(dir: string): boolean {
    try {
      const options = {
        dir,
        prefix: "test-can-write",
      };
      const tempFile = Deno.makeTempFileSync(options);
      FileUtils.removeSync(tempFile);
      return true;
    } catch (error) {
      log.debug(`Cannot create a file in ${dir}`);
      log.debug(error);
      return false;
    }
  }

  static getSize(path: string) {
    const stat = FileUtils.getFileInfoSync(path, t("lib.fs.file_utils.getSizeError"))
    return stat.size;
  }

  static throwIfNotExists(filePath: string) {
    if (!existsSync(filePath)) {
      throw new Deno.errors.NotFound(t("lib.fs.file_utils.throwIfNotExistsError", { filePath }));
    }
  }

  static createBackup(filename: string): string | undefined {
    if (!existsSync(filename)) {
      return undefined;
    }

    const now = new Date();
    let bkp = "";

    do bkp = filename + "." + DateUtils.dateTag(now) + "." + DateUtils.timeTagWithMillis("", now) + ".bkp"; while (
      existsSync(bkp)
    );

    try {
      Deno.copyFileSync(filename, bkp);
    } catch (err) {
      throw fileError(err, filename, t("lib.fs.file_utils.createBackupError"));
    }
    return bkp;
  }

  static exists(path: string): boolean {
    return existsSync(path);
  }

  static ensureDirSync(fileUri: string) {
    try {
      ensureDirSync(fileUri);
    } catch (err) {
      console.error(`Error with ${fileUri}`);
      throw err;
    }
  }

  static async createEmptyFile(filePath: string): Promise<void> {
    try {
      await Deno.writeTextFile(filePath, "");
    } catch (err) {
      throw fileError(err, filePath, t("lib.fs.file_utils.createEmptyFileError"));
    }
  }

  static readTextFileSync(filePath: string | URL): string {
    try {
      return Deno.readTextFileSync(filePath);
    } catch (err) {
      throw fileError(err, filePath, t("lib.fs.file_utils.readTextFileSyncError"));
    }
  }

  static writeTextFileSync(filePath: string | URL, data: string, options: Deno.WriteFileOptions | undefined = undefined) {
    try {
       Deno.writeTextFileSync(filePath, data, options);
    } catch (err) {
      throw fileError(err, filePath, t("lib.fs.file_utils.writeTextFileSyncError"));
    }
  }

  static removeSync(filePath: string | URL, options: Deno.RemoveOptions | undefined = undefined) {
    try {
       Deno.removeSync(filePath, options);
    } catch (err) {
      throw fileError(err, filePath, t("lib.fs.file_utils.removeSyncError"));
    }
  }

  static renameSync(oldPath: string | URL, newPath: string | URL, ) {
    try {
       Deno.renameSync(oldPath, newPath);
    } catch (err) {
      throw fileError(err, newPath, t("lib.fs.file_utils.renameSyncError", { old: oldPath}));
    }
  }
}
