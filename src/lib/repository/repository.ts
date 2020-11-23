import FileSystemPackage from '../package/file_system_package.ts'
import Package from "../package/package.ts";

export default interface Repository {
    packages: Array<Package>;
    name: string;

    resolvePackage(packageName: string): FileSystemPackage | undefined;
}
