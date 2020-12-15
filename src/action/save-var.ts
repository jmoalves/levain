import Config from '../lib/config.ts';
import Action from './action.ts';
import Package from '../lib/package/package.ts';

export default class SaveVarAction implements Action {
    constructor(
        private config: Config
    ) {
    }

    async execute(pkg: Package, parameters: string[]): Promise<void> {
        if (parameters.length !== 2) {
            throw new Error('Action - saveVar - You should inform the var name and value')
        }

        let varName = parameters[0]
        let value = parameters[1]
        this.config.setVar(varName, value)
    }
}
