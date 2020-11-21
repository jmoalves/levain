import FileSystemPackage from '../package/fileSystemPackage.ts'
import {Package} from "../package/package.ts";

export default interface Repository {
    packages: Array<Package>;
    name: string;

    resolvePackage(packageName: string): FileSystemPackage | undefined;
}
