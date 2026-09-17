import * as log from "@std/log";
import * as yaml from "@std/yaml";
import { FileUtils } from "../fs/file_utils.ts";

export default class YamlFileUtils {
  static loadFileAsObjectSync<T>(filePath: string): T {
    log.debug(`loadYamlAsObjectSync ${filePath}`);
    const yamlStr = FileUtils.readTextFileSync(filePath);
    return yaml.parse(yamlStr) as T;
  }

  static saveObjectAsFileSync(filePath: string, object: any) {
    log.debug(`saveObjectAsYamlSync ${filePath}`);
    const yamlStr = yaml.stringify(object);
    FileUtils.writeTextFileSync(filePath, yamlStr);
  }
}
