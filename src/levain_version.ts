import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import * as yaml from "https://deno.land/std/encoding/yaml.ts";

import VersionNumber from './lib/utils/version_number.ts';

export default class LevainVersion {
    static get levainSrcDir(): string {
        // https://stackoverflow.com/questions/61829367/node-js-dirname-filename-equivalent-in-deno
        return path.resolve(path.dirname(path.fromFileUrl(import.meta.url)), "..")
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
