import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {copySync} from "https://deno.land/std/fs/copy.ts";
import {existsSync} from "https://deno.land/std/fs/mod.ts";

import t from '../lib/i18n.ts'

import Config from "../lib/config.ts";
import Package from "../lib/package/package.ts";
import Loader from '../lib/loader.ts';
import {Timer} from "../lib/timer.ts";
import Registry from '../lib/repository/registry.ts';
import {parseArgs} from "../lib/parse_args.ts";
import VersionNumber from "../lib/utils/version_number.ts";
import LevainVersion from "../levain_version.ts";
import DateUtils from "../lib/utils/date_utils.ts";
import GitUtils from "../lib/utils/git_utils.ts";

import Command from "./command.ts";
import { FileUtils } from "../lib/fs/file_utils.ts";

export default class Prepare implements Command {
    constructor(private config: Config) {
    }

    async execute(args: string[]) {
        const myArgs = parseArgs(args, {
            boolean: [
                "dirs"
            ]
        })

        const urls: string[] = myArgs._

        if (urls.length == 0) {
            throw new Error(t("cmd.prepare.informURL"))
        }

        if (urls.length > 1) {
            throw new Error(t("cmd.prepare.justOneURL"))
        }

        const url = urls[0];
        if (!GitUtils.isGitPath(url)) {
            throw new Error(t("cmd.prepare.needGitPath", { url: url }))
        }

        const parsedPath = GitUtils.parseGitPath(url)
        log.info("");
        log.info("-----------------");
        log.info(t("cmd.prepare.preparing", { url: url }))
        log.info("");

        log.debug(`parsed: ${JSON.stringify(parsedPath)}`)

        if (myArgs.dirs) {
            const parentDir = path.resolve(parsedPath.user)
            FileUtils.ensureDirSync(parentDir)

            if (!FileUtils.exists(parentDir) || !FileUtils.isDir(parentDir)) {
                throw new Error(t("cmd.prepare.invalidDir", { dir: parentDir }))
            }

            Deno.chdir(parentDir)
        }

        const repoDir = path.resolve(parsedPath.repo)

        const git = new GitUtils()
        if (FileUtils.exists(repoDir)) {
            log.warning(t("cmd.prepare.dirExists", { dir: repoDir }));
        } else {
            await git.clone(parsedPath.url, repoDir)
        }

        Deno.chdir(repoDir)

        const loader = new Loader(this.config);
        await loader.command("shell", []);
    }

    readonly oneLineExample = t("cmd.prepare.example")
}
