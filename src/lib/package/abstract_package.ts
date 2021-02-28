import * as log from "https://deno.land/std/log/mod.ts";

import StringUtils from '../utils/string_utils.ts';
import Repository from '../repository/repository.ts';

import Package from './package.ts';

import VersionNumber from "../utils/version_number.ts";

export default abstract class AbstractPackage implements Package {

    abstract baseDir: string;
    abstract dependencies: string[] | undefined;
    abstract filePath: string;
    abstract installed: boolean;
    abstract name: string;
    abstract pkgDir: string;
    abstract repo: Repository | undefined;
    abstract updateAvailable: boolean;
    abstract version: VersionNumber;
    abstract yamlStruct: any;

    abstract yamlItem(key: string): any | undefined;

    get levainTag(): any {
        let levainTag:any = this.yamlItem("levain");
        if (!levainTag) {
            levainTag = {}
        }

        // Load all "levain." elements in the levainTag
        for (let property in this.yamlStruct) {
            if (property.startsWith('levain.')) {
                let item = property.replace('levain.', '')
                levainTag[item] = this.yamlStruct[property]
            }
        }

        return levainTag
    }

    skipRegistry(): Boolean {
        return StringUtils.parseBoolean(this.yamlItem("levain.pkg.skipRegistry"))
    }

    skipInstallDir(): Boolean {
        return StringUtils.parseBoolean(this.yamlItem('levain.pkg.skipInstallDir'))
    }
}
