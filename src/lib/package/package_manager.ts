import * as log from "https://deno.land/std/log/mod.ts";

import Config from "../config.ts";
import Package from "./package.ts";
import Repository from "../repository/repository.ts";
import ConsoleFeedback from "../utils/console_feedback.ts";
import StringUtils from "../utils/string_utils.ts";

export default class PackageManager {
    private knownPackages: Map<string, Package> = new Map();

    private readonly feedback = new ConsoleFeedback();

    constructor(private config: Config) {
    }
    
    resolvePackages(pkgNames: string[], installedOnly = false, showLog = true): Package[] | null {
        if (!pkgNames || pkgNames.length == 0) {
            return [];
        }

        // See https://github.com/jmoalves/levain/issues/92
        PackageManager.removeExtension(pkgNames);

        if (showLog) {
            log.info("==================================");
            this.feedback.start(`# Resolve ${pkgNames}...`);
        }

        let pkgs: Map<string, Package> = new Map();
        let names: Set<string> = new Set(); // Solving circular references - Issue #11
        let error: boolean = false;
        for (const pkgName of pkgNames) {
            if (!pkgName || !pkgName.trim()) {
                continue
            }
            let repo = (installedOnly ? this.config.repositoryManager.repositoryInstalled : this.config.repositoryManager.repository);
            let myError: boolean = this.resolveInRepo(repo, pkgs, names, pkgName, showLog);
            error = error || myError;
        }

        if (showLog) {
            this.feedback.reset(`# Resolve ${pkgNames} -> Done`);
        }

        if (error) {
            return null;
        }

        if (showLog) {
            log.debug("# Package list (in order):");
        }

        let result: Package[] = [];
        for (let name of pkgs.keys()) {
            const pkg = pkgs.get(name)!;
            this.knownPackages.set(name, pkg);
            result.push(pkg);
            if (showLog) {
                log.debug(name);
            }
        }

        return result;
    }

    static removeExtension(pkgNames: string[]) {
        log.debug(`removeExtension <- ${pkgNames}`);

        let filteredPkgNames = pkgNames
            .map(pkgName => {
                if (!pkgName || !pkgName.trim()) {
                    log.warning(`Ignoring package with null name, check your configuration file.`)
                    return "";
                } else {
                    return pkgName
                        .replace(/\.levain\.yaml$/, "")
                        .replace(/\.levain\.yml$/, "")
                        .replace(/\.levain$/, "");
                }})
            .filter(pkg => pkg !== "");

        pkgNames.splice(0, pkgNames.length, ...filteredPkgNames);

        log.debug(`removeExtension -> ${pkgNames}`);
    }

    package(pkgName: string): Package | undefined {
        return this.knownPackages.get(pkgName);
    }

    async getVar(pkgName: string, vName: string): Promise<string | undefined> {
        let pkg = this.package(pkgName);
        if (!pkg) {
            return undefined;
        }

        let value: string | undefined = undefined;

        if (!value && pkg) {
            let handler: any = pkg;
            value = handler[vName];
        }

        if (!value && pkg) {
            value = pkg.yamlItem(vName);
        }

        let pkgConfig = pkg.yamlItem("config");
        if (!value && pkgConfig) {
            value = pkgConfig[vName];
        }

        if (!value) {
            return undefined;
        }

        value = "" + value; // toString
        return await this.config.replaceVars(value!, pkgName);
    }

    getSimilarNames(pkgName: string, installedOnly = false): Set<String> {
        let repo = (installedOnly ? this.config.repositoryManager.repositoryInstalled : this.config.repositoryManager.repository)

        let names: string[] = []
        repo?.listPackages().forEach(element => {
            names.push(element.name)
        });
        return StringUtils.findSimilar(pkgName, names);
    }

    private resolveInRepo(repo: Repository, pkgs: Map<string, Package>, names: Set<String>, pkgName: string, showLog: boolean): boolean {
        // User feedback
        if (showLog) {
            this.feedback.show();
        }

        if (pkgs.has(pkgName)) {
            return false;
        } else if (names.has(pkgName)) {
            let msg = `Circular dependencies found at ${pkgName}`;
            log.debug("");
            log.debug(msg);
            log.debug("Packages seen:");
            names.forEach(name => {
                log.debug(` - ${name}`);
            });
            log.debug("");

            throw msg;
        }

        names.add(pkgName);
        log.debug(`## resolving package ${pkgName} in ${repo.describe()}`)
        const pkgDef = repo.resolvePackage(pkgName);
        if (!pkgDef) {
            log.debug("PACKAGE NOT FOUND: " + pkgName);
            return true;
        }

        // Deep first navigation - topological order of dependencies
        let error: boolean = false;
        if (pkgDef.dependencies) {
            for (let dep of pkgDef.dependencies) {
                let myError: boolean = this.resolveInRepo(repo, pkgs, names, dep, showLog);
                error = error || myError;
            }
        }

        pkgs.set(pkgName, pkgDef);
        return error;
    }
}
