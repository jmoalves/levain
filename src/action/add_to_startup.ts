import Action from './action.ts';
import Package from '../lib/package/package.ts';

export default class AddToStartupAction implements Action {

    execute(pkg: Package, parameters: string[]): Promise<void> {
        throw new Error('not implemented yet')
    }

}
