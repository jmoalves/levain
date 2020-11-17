export class FileUtils {

    static getModificationTimestamp(filePath: string): Date|undefined {
        const stat = Deno.statSync(filePath);
        const modificationTimestamp = stat.mtime;
        console.info('getModificationTimestamp', modificationTimestamp, filePath);
        return modificationTimestamp || undefined;
    }

}
