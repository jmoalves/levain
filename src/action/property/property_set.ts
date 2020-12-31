import Action from "../action.ts";
import Package from "../../lib/package/package.ts";
import Config from "../../lib/config.ts";
import PropertiesUtils from "./properties_utils.ts";

export default class PropertySetAction implements Action {

    constructor(
        private config: Config
    ) {
    }

    async execute(pkg: Package, parameters: string[]): Promise<void> {
        const filePath = parameters[0]
        const attribute = parameters[1]
        const value = parameters[2]
        return PropertiesUtils.set(filePath, attribute, value)
    }

}