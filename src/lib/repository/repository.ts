import Package from '../package/package.ts'

export default interface Repository {
    name: string;
    resolvePackage(packageName: string): Package | undefined;
}
