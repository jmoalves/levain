import FileSystemPackage from './package/fileSystemPackage.ts';

export default interface Action {
    execute(pkg: FileSystemPackage, parameters: string[]): void;
}
