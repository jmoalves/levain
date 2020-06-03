import Package from './package/package.ts'

export default interface Repository {
    resolvePackage(packageName: string): Package | undefined;
}
