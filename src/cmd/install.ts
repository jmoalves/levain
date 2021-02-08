import * as log from "https://deno.land/std/log/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";
import {existsSync, copySync} from "https://deno.land/std/fs/mod.ts";

import Config from "../lib/config.ts";
import Package from "../lib/package/package.ts";
import Loader from '../lib/loader.ts';
import {Timer} from "../lib/timer.ts";
import Registry from '../lib/repository/registry.ts';
import {parseArgs} from "../lib/parse_args.ts";

import Command from "./command.ts";

export default class Install implements Command {
    private registry: Registry;

    constructor(private config: Config) {
        this.registry = new Registry(config, config.levainRegistryDir)
    }

    async execute(args: string[]) {
        const myArgs = parseArgs(args, {
            boolean: [
                "force"
            ]
        });

        let pkgNames: string[] = myArgs._;

        if (pkgNames.length == 0) {
            let curDirPkg = this.config.repositoryManager.currentDirPackage
            if (curDirPkg && curDirPkg.dependencies && curDirPkg.dependencies.length > 0) {
                pkgNames = curDirPkg.dependencies
            }
        }


        if (pkgNames.length == 0) {
            throw new Error(`install - Nothing to install. Aborting...`);
        }

        let pkgs: Package[] | null = this.config.packageManager.resolvePackages(pkgNames);
        if (!pkgs) {
            throw new Error(`install - Nothing to install. Aborting...`);
        }

        log.info("");
        log.info("-----------------");
        let bkpTag = this.bkpTag();
        for (let pkg of pkgs) {
            await this.installPackage(bkpTag, pkg, myArgs.force);
        }

        log.info("");
        log.info("-----------------");
        log.info(`install ${JSON.stringify(pkgNames)} - FINISHED`);

        this.cleanupSaveDir();
    }

    private async installPackage(bkpTag: string, pkg: Package, force: boolean = false) {
        if (!this.config) {
            return;
        }

        const timer = new Timer();

        let shouldInstall = true;
        let verb = 'INSTALL'
        if (pkg.installed) {
            if (pkg.updateAvailable) {
                verb = 'UPDATE';
            } else if (!existsSync(pkg.baseDir)) {
                verb = 'MISSING';
            } else if (force) {
                verb = 'FORCE';
            } else {
                verb = 'ENV (already installed)';
                shouldInstall = false;
            }
        }

        log.info("");
        log.info(`=== ${verb} ${pkg.name} - ${pkg.version}`);

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
            let installActions = pkg.yamlItem("cmd.install");
            if (installActions) {
                if (!pkg.skipInstallDir()) {
                    installActions.unshift("mkdir ${baseDir}");
                }
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

        log.info(`--> ${pkg.name} took ${timer.humanize()}`);
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
                log.info(`- SAVE-MKDIR ${bkpDir}`);
                Deno.mkdirSync(bkpDir, {recursive: true});
            }

            log.info(`- SAVE-COPY  ${src} => ${dst}`);
            copySync(src, dst);

            if (pkg.yamlItem("levain.preserveBaseDirOnUpdate")) {
                log.info(`- Keeping the baseDir for ${pkg.name} as requested`);
                return true;
            }

            let renameDir = Deno.makeTempDirSync({ dir: path.dirname(src), prefix: ".rename." + path.basename(src) + ".", suffix: ".tmp" });
            log.info(`- SAVE-REN   ${src} => ${renameDir}`);
            Deno.removeSync(renameDir, { recursive: true });
            Deno.renameSync(src, renameDir);

            log.info(`- SAVE-DEL   ${renameDir}`);
            Deno.removeSync(renameDir, { recursive: true })

            log.info(`SAVED ${src} => ${dst}`);
            return true;

        } catch (err) {
            log.error(`- Found error saving ${pkg.name}. Ignoring upgrade`);
            log.debug(`SAVE error -> ${err}`);
            // Upon any error saving, abort installation
            return false;
        }
    }

    bkpTag(dt: Date = new Date()): string {
        let tag: string = "bkp-";
        tag += dt.getFullYear() + "";
        tag += (dt.getMonth() < 10 ? "0" : "") + dt.getMonth();
        tag += (dt.getDate() < 10 ? "0" : "") + dt.getDate();
        tag += "-";
        tag += (dt.getHours() < 10 ? "0" : "") + dt.getHours();
        tag += (dt.getMinutes() < 10 ? "0" : "") + dt.getMinutes();
        tag += (dt.getSeconds() < 10 ? "0" : "") + dt.getSeconds();
        return tag;
    }

    cleanupSaveDir(): void {
        // TODO: Implement this!
        // Keep backup directories create until X days ago
        // Or a maximum of N directories
        // Or a combination of both approches
    }

    readonly oneLineExample = "  install <package name>"
}
