import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import * as yaml from "https://deno.land/std/yaml/mod.ts";

import VersionNumber from './lib/utils/version_number.ts';

import Levain from '../levain.ts';

export default class LevainVersion {
    static get levainSrcDir(): string {
        return path.resolve(Levain.levainRootDir)
    }


    static get levainRecipesDir(): string {
        return path.resolve(LevainVersion.levainSrcDir, "recipes")
    }

    static get levainVersion(): VersionNumber {
        const levainRecipe = path.resolve(LevainVersion.levainRecipesDir, "levain.levain.yaml")
        const yamlStr: string = Deno.readTextFileSync(levainRecipe)
        const yamlStruct:any = yaml.parse(yamlStr)
        return new VersionNumber(yamlStruct.version);
    }

    static isHeadVersion(version?: VersionNumber): boolean {
        let myVersion = version || LevainVersion.levainVersion
        return myVersion.isHEAD
    }
}
