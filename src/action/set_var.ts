import * as log from "https://deno.land/std/log/mod.ts";

import Config from '../lib/config.ts';
import Package from '../lib/package/package.ts';

import Action from './action.ts';

export default class SetVarAction implements Action {
    constructor(
        private config: Config
    ) {
    }

    async execute(pkg: Package | undefined, parameters: string[]): Promise<void> {
        if (parameters.length !== 2) {
            throw new Error('Action - setVar - You should inform the var name and value')
        }

        let varName = parameters[0]
        let value = parameters[1]
        log.debug(`SAVE VAR ${varName} <= ${value}`)

        this.config.setVar(varName, value)
    }
}
