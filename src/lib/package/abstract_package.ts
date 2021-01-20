import StringUtils from '../utils/string_utils.ts';
import Repository from '../repository/repository.ts';

import Package from './package.ts';

export default abstract class AbstractPackage implements Package {

    abstract baseDir: string;
    abstract dependencies: string[] | undefined;
    abstract filePath: string;
    abstract installed: boolean;
    abstract name: string;
    abstract pkgDir: string;
    abstract repo: Repository | undefined;
    abstract updateAvailable: boolean;
    abstract version: string;
    abstract yamlStruct: any;

    abstract yamlItem(key: string): any;

    skipRegistry(): Boolean {
        return StringUtils.parseBoolean(this.yamlItem("levain.pkg.skipRegistry"))
    }

    skipInstallDir(): Boolean {
        return StringUtils.parseBoolean(this.yamlItem('levain.pkg.skipInstallDir'))
    }
}
