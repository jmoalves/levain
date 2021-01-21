import * as log from "https://deno.land/std/log/mod.ts";
import {parse, stringify} from "https://deno.land/std/encoding/yaml.ts";

export default class YamlFileUtils {

    static loadFileAsObjectSync<T>(filePath: string): T {
        log.debug(`loadYamlAsObjectSync ${filePath}`)
        const yamlStr = Deno.readTextFileSync(filePath)
        return parse(yamlStr) as T;
    }

    static saveObjectAsFileSync(filePath: string, object: any) {
        log.debug(`saveObjectAsYamlSync ${filePath}`)
        const yamlStr = stringify(object);
        Deno.writeTextFileSync(filePath, yamlStr)
    }

}