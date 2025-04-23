import * as log from "jsr:@std/log";

import Action from "../action.ts";
import Package from "../../lib/package/package.ts";
import Config from "../../lib/config.ts";
import {parseArgs} from "../../lib/parse_args.ts";

import PropertiesUtils from "./properties_utils.ts";

export default class PropertySetAction implements Action {

    constructor(
        private config: Config
    ) {
    }

    async execute(pkg: Package, parameters: string[]): Promise<void> {
        log.debug(`PROPERTY-SET ${parameters.join(' ')}`);


        let myArgs = parseArgs(parameters, {
            stringOnce: [],
            stringMany: [],
            boolean: [
                "ifNotExists"
            ]
        });

        if (myArgs?._?.length !== 3) {
            throw Error(`Missing parameters in "propertySet ${parameters.join(' ')}".\nCorrect usage:\npropertySet [--ifNotExists] filename property value`)
        }

        const filePath = myArgs?._?.[0]
        const attribute = myArgs?._?.[1]
        const value = myArgs?._?.[2]
        const ifNotExists = myArgs.ifNotExists
        return PropertiesUtils.set(filePath, attribute, value, ifNotExists)
    }

}