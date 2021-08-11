import Package from "./package.ts";
import Repository from "../repository/repository.ts";
import VersionNumber from "../utils/version_number.ts";

export class MockPackage implements Package {

    constructor(
        public name: string = 'mockPackage',
        public version: VersionNumber = new VersionNumber('1.0.0'),
        public filePath: string = `/mock/${name}-${version}.yml`,
        public dependencies: string[] = [],
    ) {
    }

    readonly baseDir = 'mockBaseDir';
    readonly installed = false;
    readonly pkgDir = 'mockPkgDir';
    readonly repo: Repository | undefined;
    readonly updateAvailable = false;
    readonly yamlStruct: any;
    readonly levainTag: any | undefined;

    yamlItem(key: string): any | undefined {
    }

    skipRegistry(): boolean {
        return true;
    }

    skipInstallDir(): boolean {
        return true;
    }

}
