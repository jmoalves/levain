import Action from "../action.ts";
import Package from "../../lib/package/package.ts";
import Config from "../../lib/config.ts";

export default class PropertySetAction implements Action {

    constructor(
        private config: Config
    ) {
    }

    execute(pkg: Package, parameters: string[]): Promise<void> {
        throw "Not implemented yet"
    }

}