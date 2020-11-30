import * as log from "https://deno.land/std/log/mod.ts";
import {parse, stringify} from "https://deno.land/std/encoding/yaml.ts";
import {existsSync} from "https://deno.land/std/fs/mod.ts";
import OsUtils from './os_utils.ts';

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

    static canReadSync(filePath: string) {
        // FIXME Will not need the folowwing block when Deno.statSync.mode is fully implemented for Windows
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
                    console.error(`e.name ${e.name}`)
                    console.error(e)
                }
                return false
            }
        }
        const bitwisePermission = 0b100_000_000;
        return this.checkBitwisePermission(filePath, bitwisePermission);
    }

    static canWriteSync(filePath: string) {
        if (OsUtils.isWindows()) {
            throw 'How do I check if a file/folder is writable in Windows?'
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
        console.log(`checkBitwisePermission ${filePath} ${mode} ${JSON.stringify(fileInfo)}`)
        const hasPermission = !!(mode & bitwisePermission)
        return hasPermission
    }
}
