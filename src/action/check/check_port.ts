import * as log from "jsr:@std/log";

import Config from "../../lib/config.ts";
import Package from '../../lib/package/package.ts';
import {parseArgs} from "../../lib/parse_args.ts";

import Action from "../action.ts";

export default class CheckPort implements Action {
    constructor(private config: Config) {
    }

    async execute(pkg: Package | undefined, parameters: string[]): Promise<void> {
        let args = parseArgs(parameters, {
            stringOnce: [
                "port",
                "transport",
                "address"
            ]
        });

        if (!args.port) {
            throw new Error("You must inform the port to check");
        }

        let options: any = {};
        options.port = +args.port;

        if (args.transport) {
            args.transport = args.transport.toLowerCase();
            if (args.transport != "upd" && args.transport != "tcp") {
                throw new Error("Transport should be udp or tcp");
            }
        } else {
            args.transport = "tcp";
        }

        options.transport = args.transport;

        if (args.address) {
            options.hostname = args.address;
        }

        log.debug(`CHECK-PORT ${JSON.stringify(options)}`);
        try {
            const listener = Deno.listen(options);
            listener.close();
        } catch (error) {
            throw Error(`Port already in use ${JSON.stringify(options)}`);
        }
    }
}
