import Action from "./action.ts";
import Package from "../lib/package/package.ts";
import {parseArgs} from "../lib/parse_args.ts";
import Config from "../lib/config.ts";

export default class AssertContainsAction implements Action {
    constructor(private config: Config) {
    }

    async execute(pkg: Package, parameters: string[]): Promise<void> {
        const args = parseArgs(parameters, {
            stringOnce: [
                "message"
            ]
        });

        if (args._.length != 2) {
            throw Error(`Action - expected two parametrers\nassertContains "text" "full text"`);
        }

        const text: string = args._[0]
        const fulltext: string = args._[1]
        const customMessage = args.message;

        if (!fulltext.includes(text)) {
            const defaultMessage = `Could not find "${text}" in "${fulltext}"`;
            const message = customMessage || defaultMessage;
            throw Error(message)
        }
    }

}
