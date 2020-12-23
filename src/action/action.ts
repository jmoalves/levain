import Package from '../lib/package/package.ts';

export default interface Action {
    // readonly oneLineExample: string

    execute(pkg: Package, parameters: string[]): Promise<void>
}
