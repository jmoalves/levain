import { existsSync, WalkEntry, walkSync } from "@std/fs";
import { FileUtils } from "./file_utils.ts";
import { isNotFoundFileError } from "../utils/error_utils.ts";

export default class DirUtils {
  static listFileNames(path: string): string[] {
    return this.listFiles(path)
      .map<string>((it) => it.path);
  }

  static listFiles(path: string): WalkEntry[] {
    if (!existsSync(path)) {
      throw new Deno.errors.NotFound(path);
    }
    const files = [...walkSync(path)];
    files.shift(); // removes root
    return files;
  }

  static normalizePaths(paths: string[]): string[] {
    return paths.map<string>((it) => this.normalizePath(it));
  }

  static normalizePath(path: string): string {
    return path.replace(/\\/g, "/");
  }

  static count(path: string) {
    return this.listFiles(path).length;
  }

  static isDirectory(path: string) {
    try {
      const fileInfo = FileUtils.getFileInfoSync(path);
      const dirExists = fileInfo?.isDirectory;
      return dirExists;
    } catch (err) {
      if (isNotFoundFileError(err)) {
        return false;
      }
      throw err;
    }
  }
}
