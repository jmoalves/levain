import * as yaml from "@std/yaml";

import VersionNumber from "./lib/utils/version_number.ts";

import { FileUtils } from "./lib/fs/file_utils.ts";
import LevainPaths from "./lib/paths/levain_paths.ts";

export default class LevainVersion {

  static get levainVersion(): VersionNumber {
    const levainRecipe = LevainPaths.levainRecipePath;
    const yamlStr: string = FileUtils.readTextFileSync(levainRecipe);
    const yamlStruct: any = yaml.parse(yamlStr);
    return new VersionNumber(yamlStruct.version);
  }

  static isHeadVersion(version?: VersionNumber): boolean {
    const myVersion = version || LevainVersion.levainVersion;
    return myVersion.isHEAD;
  }
}
