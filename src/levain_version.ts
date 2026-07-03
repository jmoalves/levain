import * as path from "@std/path";
import * as yaml from "@std/yaml";

import VersionNumber from "./lib/utils/version_number.ts";

import Levain from "../levain.ts";

export default class LevainVersion {
  static get levainSrcDir(): string {
    return path.resolve(Levain.levainRootDir);
  }

  static get levainRecipesDir(): string {
    return path.resolve(LevainVersion.levainSrcDir, "recipes");
  }

  static get levainVersion(): VersionNumber {
    const levainRecipe = path.resolve(LevainVersion.levainRecipesDir, "levain.levain.yaml");
    const yamlStr: string = Deno.readTextFileSync(levainRecipe);
    const yamlStruct: any = yaml.parse(yamlStr);
    return new VersionNumber(yamlStruct.version);
  }

  static isHeadVersion(version?: VersionNumber): boolean {
    const myVersion = version || LevainVersion.levainVersion;
    return myVersion.isHEAD;
  }
}
