import Config from "../config.ts";
import Package from "./package.ts";
import Repository from "../repository/repository.ts";

export default class PackageManager {
    constructor(private config: Config) {
    }

    resolvePackages(pkgNames: string[]): Package[]|null {
        let error:boolean = false;
        let pkgs:Map<string, Package> = new Map();
        for (const pkgName of pkgNames) {
            let myError:boolean = this.resolvePkgs(this.config.repository, pkgs, pkgName);
            error = error || myError;
        }

        if (error) {
            return null;
        }

        console.log("");
        console.log("=== Package list (in order):");
        let result: Package[] = [];
        for (let name of pkgs.keys()) {
            result.push(pkgs.get(name)!);
            console.log(name);
        }

        return result;
    }

    private resolvePkgs(repo:Repository, pkgs:Map<string, Package>, pkgName:string):boolean {
        if (pkgs.has(pkgName)) {
            return false;
        }

        const pkgDef = repo.resolvePackage(pkgName);
        if (!pkgDef) {
            console.error("PACKAGE NOT FOUND: " + pkgName);
            return true;
        }    

        // Deep first navigation - topological order of dependencies
        let error:boolean = false;
        if (pkgDef.dependencies) {
            for (let dep of pkgDef.dependencies) {
                let myError:boolean = this.resolvePkgs(repo, pkgs, dep);
                error = error || myError;
            }
        }

        pkgs.set(pkgName, pkgDef);
        return error;
    }
}
