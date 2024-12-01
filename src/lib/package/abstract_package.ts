import * as log from "jsr:@std/log";

import StringUtils from '../utils/string_utils.ts';
import Repository from '../repository/repository.ts';

import Package from './package.ts';

import VersionNumber from "../utils/version_number.ts";

export default abstract class AbstractPackage implements Package {
    abstract readonly name: string;
    abstract readonly version: VersionNumber|undefined;
    abstract readonly filePath: string;
    abstract readonly baseDir: string;
    abstract readonly pkgDir: string;
    abstract readonly dependencies: string[] | undefined;
    abstract readonly repo: Repository | undefined;
    abstract readonly installed: boolean;
    abstract readonly updateAvailable: boolean;
    abstract readonly yamlStruct: any;

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

    skipRegistry(): boolean {
        return StringUtils.parseBoolean(this.yamlItem("levain.pkg.skipRegistry"))
    }

    skipInstallDir(): boolean {
        return StringUtils.parseBoolean(this.yamlItem('levain.pkg.skipInstallDir'))
    }
}
