import StringUtils from '../string_utils.ts';
import Package from './package.ts';
import Repository from '../repository/repository.ts';

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

    shouldSkipRegistry(): Boolean {
        return StringUtils.parseBoolean(this.yamlItem("levain.config.skipRegistry"));
    }

    skipInstallDir(): Boolean {
        return StringUtils.parseBoolean(this.yamlItem('levain.config.skipInstallDir'))
            || !StringUtils.parseBoolean(this.yamlItem("levain.config.noBaseDir"))
    }
}
