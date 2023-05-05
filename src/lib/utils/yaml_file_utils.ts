import * as log from "https://deno.land/std/log/mod.ts";
import * as yaml from "https://deno.land/std/yaml/mod.ts";

export default class YamlFileUtils {

    static loadFileAsObjectSync<T>(filePath: string): T {
        log.debug(`loadYamlAsObjectSync ${filePath}`)
        const yamlStr = Deno.readTextFileSync(filePath)
        return yaml.parse(yamlStr) as T;
    }

    static saveObjectAsFileSync(filePath: string, object: any) {
        log.debug(`saveObjectAsYamlSync ${filePath}`)
        const yamlStr = yaml.stringify(object);
        Deno.writeTextFileSync(filePath, yamlStr)
    }

}