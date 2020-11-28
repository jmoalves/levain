import * as log from "https://deno.land/std/log/mod.ts";
import {parse, stringify} from "https://deno.land/std/encoding/yaml.ts";

export default class FileUtils {

    static getModificationTimestamp(filePath: string): Date | undefined {
        const stat = Deno.statSync(filePath);
        const modificationTimestamp = stat.mtime;
        log.debug(`getModificationTimestamp ${modificationTimestamp} --> ${filePath}`);
        return modificationTimestamp || undefined;
    }

    static loadYamlAsObjectSync<T>(fileUri: string): T {
        log.debug(`loadYamlAsObjectSync ${fileUri}`)
        const yamlStr = Deno.readTextFileSync(fileUri)
        return parse(yamlStr) as T;
    }

    static saveObjectAsYamlSync(fileUri: string, object: any) {
        log.debug(`saveObjectAsYamlSync ${fileUri}`)
        const yamlStr = stringify(object);
        Deno.writeTextFileSync(fileUri, yamlStr)
    }
}
