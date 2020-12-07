import Package from '../lib/package/package.ts';

export default interface Action {
    execute(pkg: Package, parameters: string[]): Promise<void>;
}
