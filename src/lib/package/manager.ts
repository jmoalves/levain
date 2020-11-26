import * as log from "https://deno.land/std/log/mod.ts";

import Config from "../config.ts";
import FileSystemPackage from "./file_system_package.ts";
import Repository from "../repository/repository.ts";

export default class PackageManager {
    private knownPackages: Map<string, FileSystemPackage> = new Map();

    constructor(private config: Config) {
    }

    resolvePackages(pkgNames: string[], installedOnly = false): FileSystemPackage[] | null {
        let pkgs: Map<string, FileSystemPackage> = new Map();

        if (!pkgNames || pkgNames.length == 0) {
            return null;
        }

        let error: boolean = false;
        for (const pkgName of pkgNames) {
            let repo = (installedOnly ? this.config.repositoryInstalled : this.config.repository);
            let myError: boolean = this.resolvePkgs(repo, pkgs, pkgName);
            error = error || myError;
        }

        if (error) {
            return null;
        }

        log.info("");
        log.info("=== Package list (in order):");
        let result: FileSystemPackage[] = [];
        for (let name of pkgs.keys()) {
            const pkg = pkgs.get(name)!;
            this.knownPackages.set(name, pkg);
            result.push(pkg);
            log.info(name);
        }

        return result;
    }

    package(pkgName: string): FileSystemPackage | undefined {
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

    private resolvePkgs(repo: Repository, pkgs: Map<string, FileSystemPackage>, pkgName: string): boolean {
        if (pkgs.has(pkgName)) {
            return false;
        }

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
                let myError: boolean = this.resolvePkgs(repo, pkgs, dep);
                error = error || myError;
            }
        }

        pkgs.set(pkgName, pkgDef);
        return error;
    }
}
