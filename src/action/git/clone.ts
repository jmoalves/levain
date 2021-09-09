import * as log from "https://deno.land/std/log/mod.ts"

import Action from "../action.ts"
import Package from "../../lib/package/package.ts"
import {parseArgs} from "../../lib/parse_args.ts"
import GitUtils from "../../lib/utils/git_utils.ts"
import DirUtils from "../../lib/fs/dir_utils.ts";


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

        log.debug(`CLONE ${srcUrl} ${destDir}`)

        if (DirUtils.count(destDir) > 0) {
            log.debug(`skipping clone, ${destDir} already has content`)
            return
        }

        const gitUtils = new GitUtils();
        return await gitUtils.clone(srcUrl, destDir)
    }

}
