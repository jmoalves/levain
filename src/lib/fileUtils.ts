import * as log from "https://deno.land/std/log/mod.ts";

export class FileUtils {

    static getModificationTimestamp(filePath: string): Date|undefined {
        const stat = Deno.statSync(filePath);
        const modificationTimestamp = stat.mtime;
        log.info(`getModificationTimestamp ${modificationTimestamp} --> ${filePath}`);
        return modificationTimestamp || undefined;
    }

}
