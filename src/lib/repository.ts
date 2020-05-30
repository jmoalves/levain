import Package from './package.ts'

export default interface Repository {
    resolvePackage(packageName: string): Package | undefined;
}
