import * as log from "https://deno.land/std/log/mod.ts";

import Action from "../action.ts";
import Package from "../../lib/package/package.ts";
import {parseArgs} from "../../lib/parse_args.ts";
import GitUtils from "../../lib/utils/git_utils.ts";
import TestHelper from "../../lib/test/test_helper.ts";


export default class GitCloneAction implements Action {

    // TODO readonly oneLineExample = 'clone <src-url> <dest-dir> --branch <branch name>'
    readonly oneLineExample = 'clone <src-url> <dest-dir>'

    async execute(pkg: Package | undefined, parameters: string[]): Promise<void> {
        const myArgs = parseArgs(parameters, {})
        const params = myArgs?._;

        if (params?.length !== 2) {
            throw new Error(`Usage: ${this.oneLineExample}`)
        }

        const srcUrl = params?.[0]
        const destDir = params?.[1]

        log.info(`CLONE ${srcUrl} ${destDir}`)

        const gitUtils = new GitUtils(TestHelper.getConfig());
        return await gitUtils.clone(srcUrl, destDir)
    }

}
