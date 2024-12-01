import * as log from "jsr:@std/log";
import * as path from "jsr:@std/path";
import {existsSync, copySync} from "jsr:@std/fs";

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

export default class Clone implements Command {
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
            throw new Error(t("cmd.clone.informURL"))
        }

        if (urls.length > 1) {
            throw new Error(t("cmd.clone.justOneURL"))
        }

        const url = urls[0];
        if (!GitUtils.isGitPath(url)) {
            throw new Error(t("cmd.clone.needGitPath", { url: url }))
        }

        const parsedPath = GitUtils.parseGitPath(url)
        log.info("");
        log.info("-----------------");
        log.info(t("cmd.clone.preparing", { url: url }))
        log.info("");

        log.debug(`parsed: ${JSON.stringify(parsedPath)}`)

        if (myArgs.dirs) {
            const parentDir = path.resolve(parsedPath.user)
            FileUtils.ensureDirSync(parentDir)

            if (!FileUtils.exists(parentDir) || !FileUtils.isDir(parentDir)) {
                throw new Error(t("cmd.clone.invalidDir", { dir: parentDir }))
            }

            Deno.chdir(parentDir)
        }

        const repoDir = path.resolve(parsedPath.repo)

        const git = new GitUtils()
        if (FileUtils.exists(repoDir)) {
            log.warn(t("cmd.clone.dirExists", { dir: repoDir }));
        } else {
            await git.clone(parsedPath.url, repoDir)
        }

        Deno.chdir(repoDir)

        await this.config.repositoryManager.reloadCurrentDir();
        const loader = new Loader(this.config);
        await loader.command("shell", []);
    }

    readonly oneLineExample = t("cmd.clone.example")
}
