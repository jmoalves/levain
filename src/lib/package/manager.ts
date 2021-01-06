import * as log from "https://deno.land/std/log/mod.ts";

import Config from "../config.ts";
import Package from "./package.ts";
import Repository from "../repository/repository.ts";

export default class PackageManager {
    private knownPackages: Map<string, Package> = new Map();

    constructor(private config: Config) {
    }

    resolvePackages(pkgNames: string[], installedOnly = false): Package[] | null {
        if (!pkgNames || pkgNames.length == 0) {
            return null;
        }

        let pkgs: Map<string, Package> = new Map();
        let names: Set<string> = new Set(); // Solving circular references - Issue #11
        let error: boolean = false;
        for (const pkgName of pkgNames) {
            let repo = (installedOnly ? this.config.repositoryManager.repositoryInstalled : this.config.repositoryManager.repository);
            let myError: boolean = this.resolvePkgs(repo, pkgs, names, pkgName);
            error = error || myError;
        }

        if (error) {
            return null;
        }

        log.info("");
        log.info("=== Package list (in order):");
        let result: Package[] = [];
        for (let name of pkgs.keys()) {
            const pkg = pkgs.get(name)!;
            this.knownPackages.set(name, pkg);
            result.push(pkg);
            log.info(name);
        }

        return result;
    }

    package(pkgName: string): Package | undefined {
        return this.knownPackages.get(pkgName);
    }

    getVar(pkgName: string, vName: string): string | undefined {
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
        return this.config.replaceVars(value!, pkgName);
    }

    private resolvePkgs(repo: Repository, pkgs: Map<string, Package>, names: Set<String>, pkgName: string): boolean {
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
        log.debug(`resolving package ${pkgName}`)
        const pkgDef = repo.resolvePackage(pkgName);
        if (!pkgDef) {
            log.error("PACKAGE NOT FOUND: " + pkgName);
            return true;
        }

        // Deep first navigation - topological order of dependencies
        let error: boolean = false;
        if (pkgDef.dependencies) {
            for (let dep of pkgDef.dependencies) {
                let myError: boolean = this.resolvePkgs(repo, pkgs, names, dep);
                error = error || myError;
            }
        }

        pkgs.set(pkgName, pkgDef);
        return error;
    }
}
