import * as log from "https://deno.land/std/log/mod.ts";
import {parse, stringify} from "https://deno.land/std/encoding/yaml.ts";
import {existsSync} from "https://deno.land/std/fs/mod.ts";

export default class FileUtils {

    static getModificationTimestamp(filePath: string): Date | undefined {
        const stat = this.getFileInfo(filePath);
        const modificationTimestamp = stat.mtime;
        log.debug(`getModificationTimestamp ${modificationTimestamp} --> ${filePath}`);
        return modificationTimestamp || undefined;
    }

    static getFileInfo(filePath: string): Deno.FileInfo {
        const stat = Deno.statSync(filePath);
        return stat;
    }

    static loadYamlAsObjectSync<T>(filePath: string): T {
        log.debug(`loadYamlAsObjectSync ${filePath}`)
        const yamlStr = Deno.readTextFileSync(filePath)
        return parse(yamlStr) as T;
    }

    static saveObjectAsYamlSync(filePath: string, object: any) {
        log.debug(`saveObjectAsYamlSync ${filePath}`)
        const yamlStr = stringify(object);
        Deno.writeTextFileSync(filePath, yamlStr)
    }

    static canRead(filePath: string) {
        const bitwisePermission = 0b100_000_000;
        return this.checkBitwisePermission(filePath, bitwisePermission);
    }

    static canWrite(filePath: string) {
        const bitwisePermission = 0b010_000_000;
        return this.checkBitwisePermission(filePath, bitwisePermission);
    }

    private static checkBitwisePermission(filePath: string, bitwisePermission: number) {
        if (!existsSync(filePath)) {
            return false
        }
        const fileInfo = this.getFileInfo(filePath);
        const mode = fileInfo.mode || 0;
        const hasPermission = !!(mode & bitwisePermission)
        return hasPermission
    }
}
