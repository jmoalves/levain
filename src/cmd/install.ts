import * as log from "jsr:@std/log";
import * as path from "jsr:@std/path";
import { copySync, existsSync, moveSync } from "jsr:@std/fs";

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
import {retry} from "../lib/utils/utils.ts";

import Command from "./command.ts";

export default class Install implements Command {
    private registry: Registry;
    private readonly currentLevainVersion: VersionNumber;
    private readonly maxRetries = 5;

    constructor(private config: Config) {
        this.registry = new Registry(config, config.levainRegistryDir)
        this.currentLevainVersion = LevainVersion.levainVersion;
    }

    async execute(args: string[]) {
        const myArgs = parseArgs(args, {
            boolean: [
                "force",
                "noUpdate"
            ]
        });

        let pkgNames: string[] = myArgs._;

        if (pkgNames.length == 0) {
            let curDirPkg = await this.config.repositoryManager.currentDirPackage()
            if (curDirPkg && curDirPkg.dependencies && curDirPkg.dependencies.length > 0) {
                pkgNames = curDirPkg.dependencies
            }
        }

        if (pkgNames.length == 0) {
            throw new Error(t("cmd.install.noPackages"));
        }

        let pkgs: Package[] | null = this.config.packageManager.resolvePackages(pkgNames);
        if (!pkgs) {
            let missing = pkgNames.filter(name => !this.config.packageManager.getSimilarNames(name).has(name))

            log.info(``)
            log.info(t("cmd.install.unableToFind", { pkgNames: missing }))

            log.info("")
            log.info(t("cmd.install.similar"))
            for (let name of missing) {
                log.info(`${name} => ${[...this.config.packageManager.getSimilarNames(name)]}`)
            }
            log.info("")
            throw new Error(t("cmd.install.errorNotFound", { pkgNames: missing }));
        }

        log.info("");
        log.info("-----------------");

        if (myArgs.force) {
            myArgs.noUpdate = false
        }

        let shouldUpdate = true
        if (myArgs.noUpdate) {
            shouldUpdate = false
        }

        if (!myArgs.force && !myArgs.noUpdate) {
            // Check updates
            let willUpdate = []
            let willInstall = []

            for (let pkg of pkgs) {
                const name = pkg.name
                if (!pkg.installed) {
                    willInstall.push(name)
                } else if (pkg.updateAvailable) {
                    willUpdate.push(pkg.name)
                }
            }

            if (willInstall.length > 0) {
                log.debug(t("cmd.install.installing", { object: JSON.stringify(willInstall) }))
                log.debug(t("cmd.install.updating", { object: JSON.stringify(willUpdate) }))
            } else if (willUpdate.length > 0) {
                log.info("")
                log.info("")
                log.info(t("cmd.install.updateAvailable"))
                log.info(`${JSON.stringify(willUpdate, null, 3)}`)
                log.info("")

                let answer = prompt(t("cmd.install.updatePrompt"), t("cmd.install.updatePromptDefault"))
                if (!answer || ![t("cmd.install.updatePromptDefault")].includes(answer.toUpperCase())) {
                    log.info(t("cmd.install.askLater"))
                    shouldUpdate = false

                    log.info("")
                    log.info(t("cmd.install.reloadInstalled"))
                    pkgs = this.config.packageManager.resolvePackages(pkgNames, true);
                    if (!pkgs) {
                        throw new Error(t("cmd.install.nothing"));
                    }
                }
            }
        }

        let pkgNameSet = new Set(pkgNames);
        let bkpTag = this.bkpTag();
        for (let pkg of pkgs) {
            let forcePkg = myArgs.force && pkgNameSet.has(pkg.name);
            await this.installPackage(bkpTag, pkg, forcePkg, shouldUpdate);
        }

        log.debug("");
        log.debug("-----------------");
        log.debug(t("cmd.install.finished", { pkgNames: pkgNames }));
    }

    private async installPackage(bkpTag: string, pkg: Package, force: boolean = false, shouldUpdate: boolean = true) {
        if (!this.config) {
            return;
        }

        const timer = new Timer();

        let shouldInstall = true;
        let verb = 'INSTALL'
        if (pkg.installed) {
            if (!pkg.skipInstallDir() && !existsSync(pkg.baseDir)) {
                verb = 'MISSING';
            } else if (shouldUpdate && pkg.updateAvailable) {
                verb = 'UPDATE';
            } else if (force) {
                verb = 'FORCE';
            } else {
                verb = 'ALREADY INSTALLED';
                shouldInstall = false;
            }
        }

        if (shouldInstall) {
            log.info("")
            log.info(`- ${verb} ${pkg.name}@${pkg.version}`);
        } else {
            log.info(`✓ ${pkg.name}@${pkg.version}`);
        }

        if (shouldInstall) {
            const levainTag = pkg.levainTag;
            log.debug(`- ${pkg.name} - levainTag: ${JSON.stringify(levainTag)}`)

            if (levainTag?.minVersion) {
                const minVersion = new VersionNumber(levainTag?.minVersion)
                if (minVersion.isNewerThan(this.currentLevainVersion)) {
                    log.warn(t("cmd.install.ignoreMinVer", { pkg: pkg.name, min: minVersion, current: this.currentLevainVersion}))
                    shouldInstall = false
                }
            }

            if (!shouldInstall && !pkg.installed) {
                log.error(t("cmd.install.mustUpgradeLevain", { pkg: pkg.name}))
            }
        }

        if (shouldInstall) {
            /* FIXME: 
             * Move this to another class. Perhaps a class to manage the installed environment
             * Perhaps the better approach is to install the packages to a temp dir and move upon successful installation
             * However, this "tempDir" change could EASILY BREAK all the recipes
             */

            shouldInstall = await this.savePreviousInstall(bkpTag, pkg);
        }

        // https://github.com/jmoalves/levain/issues/148
        if (shouldInstall) {
            let registryEntry = path.resolve(this.config.levainRegistryDir, path.basename(pkg.filePath));
            if (existsSync(registryEntry)) {
                try {
                    log.debug(`REMOVE ${registryEntry}`)
                    Deno.removeSync(registryEntry);
                } catch (error) {
                    log.debug(t("cmd.install.ignoreError", { error: error }))
                    shouldInstall = false
                }
            }
        }

        let actions = [];

        if (shouldInstall) {
            let installActions = pkg.yamlItem("cmd.install") || [];
            if (!pkg.skipInstallDir()) {
                installActions.unshift("mkdir ${baseDir}");
            }

            // Standard actions - At the head (unshift), they are in reverse order (like a STACK)
            actions.unshift("mkdir " + this.config.levainSafeTempDir);
            actions.unshift("mkdir " + this.config.levainRegistryDir);
            actions.unshift("mkdir --compact ${levainHome}");

            Array.prototype.push.apply(actions, installActions);
        }

        // Standard actions - Env - At the rear (push), they are in normal order (like a QUEUE)
        let envActions = pkg.yamlItem("cmd.env");
        if (envActions) {
            Array.prototype.push.apply(actions, envActions);
        }

        if (shouldInstall) {
            // Standard actions - At the rear (push), they are in normal order (like a QUEUE)
            if (!pkg.skipRegistry()) {
                // TODO this.registry.add(pkg)
                actions.push(`copy --verbose ${pkg.filePath} ${this.config.levainRegistryDir}`);
            }
        }

        const loader = new Loader(this.config);
        for (let action of actions) {
            await loader.action(pkg, action);
        }

        log.debug(t("cmd.install.pkgTook", { pkg: pkg.name, timer: timer.humanize()}));
        return;
    }

    private async savePreviousInstall(bkpTag: string, pkg: Package): Promise<boolean> {
        if (!existsSync(pkg.baseDir)) {
            log.debug(t("cmd.install.goodNotSave", { baseDir: pkg.baseDir }));
            return true;
        }

        try {
            let bkpDir = path.resolve(this.config.levainBackupDir, bkpTag);
            let src = pkg.baseDir;
            let dst = path.resolve(bkpDir, path.basename(src));

            log.info(`SAVING ${src} => ${dst}`);

            if (!existsSync(bkpDir)) {
                log.debug(`- SAVE-MKDIR ${bkpDir}`);
                Deno.mkdirSync(bkpDir, {recursive: true});
            }

            log.debug(`- SAVE-COPY  ${src} => ${dst}`);
            copySync(src, dst);

            if (pkg.yamlItem("levain.preserveBaseDirOnUpdate")) {
                log.info(t("cmd.install.keepingBaseDir", { pkg: pkg.name }));
                return true;
            }

            let deletedDir = Deno.makeTempDirSync({
                dir: path.dirname(src),
                prefix: ".deleted." + path.basename(src) + ".",
                suffix: ".tmp"
            });
            log.debug(`- SAVE-PRE   ${deletedDir}`);
            await retry(this.maxRetries, () => Deno.removeSync(deletedDir, {recursive: true}))

            log.debug(`- SAVE-MOV   ${src} => ${deletedDir}`);
            await retry(this.maxRetries, () => moveSync(src, deletedDir))

            try {
                log.debug(`- SAVE-DEL   ${deletedDir}`);
                await retry(this.maxRetries, () => Deno.removeSync(deletedDir, {recursive: true}))
            } catch (error) {
                log.debug(t("cmd.install.ignoreError", { error: error }))
            }

            log.debug(`SAVED ${src} => ${dst}`);
            return true;

        } catch (err) {
            log.error(t("cmd.install.errorSaving", { pkg: pkg.name }));
            log.debug(`SAVE error -> ${err}`);
            // Upon any error saving, abort installation
            return false;
        }
    }

    bkpTag(dt: Date = new Date()): string {
        return `bkp-${DateUtils.dateTimeTag(dt)}`;
    }

    readonly oneLineExample = t("cmd.install.example")
}
