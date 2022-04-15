import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {copySync} from "https://deno.land/std/fs/copy.ts";
import {existsSync} from "https://deno.land/std/fs/mod.ts";

import Config from "../lib/config.ts";
import Package from "../lib/package/package.ts";
import Loader from '../lib/loader.ts';
import {Timer} from "../lib/timer.ts";
import Registry from '../lib/repository/registry.ts';
import {parseArgs} from "../lib/parse_args.ts";
import VersionNumber from "../lib/utils/version_number.ts";
import LevainVersion from "../levain_version.ts";
import DateUtils from "../lib/utils/date_utils.ts";

import Command from "./command.ts";

export default class Install implements Command {
    private registry: Registry;
    private readonly currentLevainVersion: VersionNumber;

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
            throw new Error(`What packages do your want to install? Aborting...`);
        }

        let pkgs: Package[] | null = this.config.packageManager.resolvePackages(pkgNames);
        if (!pkgs) {
            log.info(``)
            log.info(`${pkgNames} - Unable to find some packages`)

            log.info("")
            log.info("=== Similar known packages")
            for (let name of pkgNames) {
                log.info(`${name} => ${[...this.config.packageManager.getSimilarNames(name)]}`)
            }
            log.info("")
            throw new Error(`Couldn't find package ${pkgNames} to install. Aborting...`);
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
                log.debug(`- Installing - ${JSON.stringify(willInstall)}`)
                log.debug(`- Updating - ${JSON.stringify(willUpdate)}`)
            } else if (willUpdate.length > 0) {
                log.info("")
                log.info("")
                log.info(`Some packages have an update available.`)
                log.info(`${JSON.stringify(willUpdate, null, 3)}`)
                log.info("")

                let answer = prompt("Should we update them now (Y,n)?", "Y")
                if (!answer || !["Y", "YES"].includes(answer.toUpperCase())) {
                    log.info("Ok. We will ask again later.")
                    shouldUpdate = false

                    log.info("")
                    log.info("Reloading packages - installed only.")
                    pkgs = this.config.packageManager.resolvePackages(pkgNames, true);
                    if (!pkgs) {
                        throw new Error(`install - Nothing to install. Aborting...`);
                    }
                }
            }
        }

        let bkpTag = this.bkpTag();
        for (let pkg of pkgs) {
            await this.installPackage(bkpTag, pkg, myArgs.force, shouldUpdate);
        }

        log.debug("");
        log.debug("-----------------");
        log.debug(`install ${JSON.stringify(pkgNames)} - FINISHED`);
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
                    log.warning(`- We will IGNORE the package ${pkg.name} installation. It needs a newer levain version ${minVersion} - Your version is ${this.currentLevainVersion}`)
                    shouldInstall = false
                }
            }

            if (!shouldInstall && !pkg.installed) {
                log.error(`You must upgrade your levain (or fix the package ${pkg.name} configuration)`)
            }
        }

        if (shouldInstall) {
            /* FIXME: 
             * Move this to another class. Perhaps a class to manage the installed environment
             * Perhaps the better approach is to install the packages to a temp dir and move upon successful installation
             * However, this "tempDir" change could EASILY BREAK all the recipes
             */

            shouldInstall = this.savePreviousInstall(bkpTag, pkg);
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

        log.debug(`--> ${pkg.name} took ${timer.humanize()}`);
        return;
    }

    savePreviousInstall(bkpTag: string, pkg: Package): boolean {
        if (!existsSync(pkg.baseDir)) {
            log.debug(`Good. We do not need to save ${pkg.baseDir} because it does not exist`);
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
                log.info(`- Keeping the baseDir for ${pkg.name} as requested`);
                return true;
            }

            let renameDir = Deno.makeTempDirSync({
                dir: path.dirname(src),
                prefix: ".rename." + path.basename(src) + ".",
                suffix: ".tmp"
            });
            log.debug(`- SAVE-REN   ${src} => ${renameDir}`);
            Deno.removeSync(renameDir, {recursive: true});
            Deno.renameSync(src, renameDir);

            try {
                log.debug(`- SAVE-DEL   ${renameDir}`);
                Deno.removeSync(renameDir, {recursive: true})
            } catch (error) {
                log.debug(`Ignoring - ${error}`)
            }

            log.debug(`SAVED ${src} => ${dst}`);
            return true;

        } catch (err) {
            log.error(`- Found error saving ${pkg.name}. Ignoring upgrade`);
            log.debug(`SAVE error -> ${err}`);
            // Upon any error saving, abort installation
            return false;
        }
    }

    bkpTag(dt: Date = new Date()): string {
        return `bkp-${DateUtils.dateTimeTag(dt)}`;
    }

    readonly oneLineExample = "  install <package name>"
}
