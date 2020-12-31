import Action from "../action.ts";
import Package from "../../lib/package/package.ts";
import Config from "../../lib/config.ts";
import PropertiesUtils from "./properties_utils.ts";
import * as log from "https://deno.land/std/log/mod.ts";
import {parseArgs} from "../../lib/parse_args.ts";

export default class PropertySetAction implements Action {

    constructor(
        private config: Config
    ) {
    }

    async execute(pkg: Package, parameters: string[]): Promise<void> {
        log.info(`PROPERTY-SET ${parameters.join(' ')}`);


        let myArgs = parseArgs(parameters, {
            stringOnce: [],
            stringMany: [],
            boolean: [
                "ifNotExists"
            ]
        });

        if (myArgs?._?.length < 3) {
            throw Error(`Missing parameters in "propertySet ${parameters.join(' ')}".\nCorrect usage:\npropertySet [--ifNotExists] filename property value`)
        }

        const filePath = parameters[0]
        const attribute = parameters[1]
        const value = parameters[2]
        return PropertiesUtils.set(filePath, attribute, value)
    }

}