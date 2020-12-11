import Package from "./package.ts";
import Repository from "../repository/repository.ts";

export class MockPackage implements Package {

    constructor(
        public name: string = 'mockPackage',
        public version: string = '1.0.0',
        public filePath: string = `/mock/${name}-${version}.yml`,
    ) {
    }

    readonly baseDir = 'mockBaseDir';
    readonly dependencies: string[] | undefined;
    readonly installed = false;
    readonly pkgDir = 'mockPkgDir';
    readonly repo: Repository | undefined;
    readonly updateAvailable = false;
    readonly yamlStruct: any;

    yamlItem(key: string): any {
    }

    skipRegistry(): Boolean {
        return true;
    }

    skipInstallDir(): Boolean {
        return true;
    }

}
