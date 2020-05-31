import Action from "../lib/action.ts";
import Config from "../lib/config.ts";
import Package from '../lib/package.ts';

export default class Extract implements Action {
    constructor(private config:Config) {
    }

    execute(pkg:Package, parameters:string[]):void {
        console.log("Extract: ", JSON.stringify(parameters));
    }
}