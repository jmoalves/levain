import Repository from "../repository/repository.ts";
import VersionNumber from "../utils/version_number.ts";

export default interface Package {
    readonly name: string;
    readonly version: VersionNumber;
    readonly filePath: string;
    readonly baseDir: string;
    readonly pkgDir: string;
    readonly dependencies: string[] | undefined;
    readonly repo: Repository | undefined;
    readonly installed: boolean;
    readonly updateAvailable: boolean;
    readonly yamlStruct: any;
    readonly levainTag: any | undefined; // FIXME: Use a well defined structure

    yamlItem(key: string): any | undefined;

    skipRegistry(): Boolean;

    skipInstallDir(): Boolean;
}
