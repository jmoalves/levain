import Action from "../action.ts";
import Package from "../../lib/package/package.ts";
import {parseArgs} from "../../lib/parse_args.ts";
import OsUtils from "../../lib/os/os_utils.ts";

export default class KillProcessAction implements Action {

    async execute(pkg: Package | undefined, parameters: string[]): Promise<void> {
        const args = parseArgs(parameters)

        const processName = args._[0]
        if (!processName) {
            throw Error('You must inform the process name')
        }

        OsUtils.onlyInWindows()
        const cmd = [
            'taskkill',
            '/f',
            '/im',
            processName,
        ]

        await OsUtils.runAndLog(cmd);
    }

}
