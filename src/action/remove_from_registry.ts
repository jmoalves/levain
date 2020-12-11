import Config from '../lib/config.ts';
import Action from './action.ts';
import Package from '../lib/package/package.ts';

export default class RemoveFromRegistry implements Action {
    constructor(
        config: Config
    ) {
    }

    execute(pkg: Package, parameters: string[]): Promise<void> {
        return Promise.resolve(undefined);
    }
}
