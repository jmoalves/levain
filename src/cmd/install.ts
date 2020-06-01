import Command from "../lib/command.ts";
import Config from "../lib/config.ts";
import Package from "../lib/package.ts";
import Repository from "../lib/repository.ts";
import Loader from '../lib/loader.ts';

export default class Install implements Command {
    constructor(private config:Config) {
    }

    async execute(args: string[]) {
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
        console.log("Packages to install =>", pkgs.keys());

        console.log("==================================");
        for (let name of pkgs.keys()) {
            let pkg = pkgs.get(name);
            if (pkg) {
                await this.installPackage(pkg);
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

    private async installPackage(pkg: Package) {
        if (!this.config) {
            return;
        }

        console.log("");
        console.log("=== INSTALL", pkg.name, "-", pkg.version);
        let actions = pkg.yamlItem("cmd.install")
        if (!actions) {
            console.log("Nothing to do");
            return;
        }

        // Standard actions - At the head (unshift), this is a STACK! (reverse order)
        actions.unshift("mkdir ${baseDir}");
        actions.unshift("mkdir ${levainHome}/.levainRegistry");
        actions.unshift("mkdir --compact ${levainHome}"); 
      
        // Standard actions - At the rear (push), it is in normal order        
        actions.push("copy --verbose " + pkg.name + ".levain.yaml ${levainHome}/.levainRegistry");
        //

        const loader = new Loader(this.config);
        for (let action of actions) {
            await loader.action(pkg, action);
        }
    }
}
