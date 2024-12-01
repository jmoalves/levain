import {existsSync, WalkEntry, walkSync} from "jsr:@std/fs";

export default class DirUtils {

    static listFileNames(path: string): string[] {
        return this.listFiles(path)
            .map<string>(it => it.path)
    }

    static listFiles(path: string): WalkEntry[] {
        if (!existsSync(path)) {
            throw new Deno.errors.NotFound(path)
        }
        const files = [...walkSync(path)]
        files.shift() // removes root
        return files
    }

    static normalizePaths(paths: string[]): string[] {
        return paths.map<string>(it => this.normalizePath(it))
    }

    static normalizePath(path: string): string {
        return path.replace(/\\/g, '/');
    }

    static count(path: string) {
        return this.listFiles(path).length
    }

    static isDirectory(path: string) {
        try {
            const fileInfo = Deno.statSync(path)
            const dirExists = fileInfo?.isDirectory
            return dirExists
        } catch (err) {
            if (err instanceof Deno.errors.NotFound) {
                return false
            }
            throw err
        }
    }
}
