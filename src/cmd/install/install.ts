import Command from "../../lib/command.ts";
import Config from "../../lib/config.ts";
import Package from "../../lib/package.ts";
import Repository from "../../lib/repository.ts";

export default class Install implements Command {
    constructor(private config:Config) {
    }

    execute(args: string[]): void {
        console.log("install " + JSON.stringify(args));

        let error:boolean = false;
        let pkgs:Map<string, Package> = new Map();
        for (const pkgName of args) {
            let myError:boolean = this.resolvePackages(this.config.repository, pkgs, pkgName);
            error = error || myError;
        }

        if (error) {
            console.error("");
            return;
        }

        console.log("");
        console.log("================");
        for (let name of pkgs.keys()) {
            let pkg = pkgs.get(name);
            if (pkg) {
                this.installPackage(pkg);
            }
        }
    }

    private resolvePackages(repo:Repository, pkgs:Map<string, Package>, pkgName:string):boolean {
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
                let myError:boolean = this.resolvePackages(repo, pkgs, dep);
                error = error || myError;
            }
        }

        pkgs.set(pkgName, pkgDef);
        return error;
    }

    private installPackage(pkg: Package): void {
        if (!this.config) {
            return;
        }

        console.log("INSTALL " + pkg.name);
        let actions = pkg.yamlItem("install")
        if (!actions) {
            console.log("Nothing to do");
            return;
        }

        for (let action of actions) {
            console.log(this.config.replaceVars(pkg, action));
        }
    }
}
