import Package from '../lib/package/package.ts';

export default interface Action {
    // readonly oneLineExample: string

    execute(pkg: Package|undefined, parameters: string[]): Promise<void>
}
