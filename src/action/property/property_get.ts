import Action from "../action.ts";
import Package from "../../lib/package/package.ts";
import {parseArgs} from "../../lib/parse_args.ts";
import * as log from "https://deno.land/std/log/mod.ts";
import Config from "../../lib/config.ts";
import PropertiesUtils from "./properties_utils.ts";

export default class PropertyGetAction implements Action {
    constructor(
        private config: Config
    ) {
    }

    async execute(pkg: Package, parameters: string[]) {
        log.info(`PROPERTY-GET ${parameters.join(' ')}`);

        let myArgs = parseArgs(parameters, {
            stringOnce: [
                "setVar",
                "default"
            ],
            stringMany: [],
            boolean: []
        });

        const filePath = myArgs._[0];
        const propertyName = myArgs._[1];
        const properties = PropertiesUtils.load(filePath)
        const value = properties.get(propertyName);
        this.config.setVar(myArgs.setVar, value || '')
    }

}