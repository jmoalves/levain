import FileSystemPackage from '../lib/package/file_system_package.ts';

export default interface Action {
    execute(pkg: FileSystemPackage, parameters: string[]): void;
}
