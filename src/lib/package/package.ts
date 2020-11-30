import Repository from "../repository/repository.ts";

export default interface Package {
    readonly name: string;
    readonly version: string;
    readonly filePath: string;
    readonly baseDir: string;
    readonly pkgDir: string;
    readonly dependencies: string[] | undefined;
    readonly repo: Repository | undefined;
    readonly installed: boolean;
    readonly updateAvailable: boolean;
    readonly yamlStruct: any;
    yamlItem(key: string): any | undefined;
}