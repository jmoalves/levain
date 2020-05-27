import Package from './package'

export default interface Repository {
    resolvePackage(packageName: string): Package | undefined;
}
