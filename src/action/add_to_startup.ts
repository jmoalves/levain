import Package from '../lib/package/package.ts';

import Action from './action.ts';

export default class AddToStartupAction implements Action {

    execute(pkg: Package, parameters: string[]): Promise<void> {
        throw new Error('not implemented yet')
    }

}
