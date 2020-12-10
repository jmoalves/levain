import {WalkEntry, walkSync,} from "https://deno.land/std/fs/mod.ts";

export default class DirUtils {

    static listFileNames(path: string): string[] {
        return this.listFiles(path)
            .map<string>(it => it.path)
    }

    static listFiles(path: string): WalkEntry[] {
        return [...walkSync(path)];
    }
}
