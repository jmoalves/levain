import * as path from "https://deno.land/std/path/mod.ts";

import Package from './package/package.ts';

import Repository from './repository/repository.ts'
import CacheRepository from './repository/cache.ts'
import ChainRepository from './repository/chain.ts'
import NullRepository from './repository/null.ts'
import FileSystemRepository from './repository/fs.ts'
import PackageManager from "./package/manager.ts";

export default class Config {
  private _pkgManager: PackageManager;
  private _repository: Repository;
  private _env:any = {};

  constructor(args: any) {
    this.configEnv(args);
    this.configHome();
    this._repository = this.configRepo(args);
    this._pkgManager = new PackageManager(this);

    console.log("Config:");
    console.log(JSON.stringify(this._env, null, 3));
  }

  get repository(): Repository {
    return this._repository;
  }

  get packageManager(): PackageManager {
    return this._pkgManager;
  }

  get levainHome(): string {
    return this._env["levainHome"];
  }

  get levainRegistry(): string {
    return path.resolve(this.levainHome, ".levain", "registry");
  }

  replaceVars(text: string, pkgName?: string|undefined): string {
    let myText:string = text;
    let vars = myText.match(/\${[^${}]+}/);
    while (vars) {
      for (let v of vars) {
        let vName = v.replace("$", "").replace("{", "").replace("}", "");
        let value: string|undefined = undefined;

        if (!value && vName.search(/^pkg\.([^.]+)\.(.*)/) != -1) {
          let pkgVarPkg = vName.replace(/^pkg\.([^.]+)\.(.*)/, "$1");
          let pkgVarName = vName.replace(/^pkg\.([^.]+)\.(.*)/, "$2");
          value = this.packageManager.getVar(pkgVarPkg, pkgVarName);
        }

        if (!value && this._env) {
          value = this._env[vName];
        }

        if (!value && pkgName) {
          value = this.packageManager.getVar(pkgName, vName);
        }

        if (!value && vName == "home") {
          value = this.homedir();
        }

        if (value) {
          myText = myText.replace(v, value);  
        } else {
          throw `${v} is undefined`;
        }
      }
 
      vars = myText.match(/\${[^${}]+}/);
    }

    return myText;
  }

  get extraBinDir(): string {
    return path.resolve(this.levainSrcDir, "extra-bin", Deno.build.os);
  }

  /////////////////////////////////////////////////////////////////////////////////
  private configEnv(args: any): void {
    Object.keys(args).forEach(key => {
      if (!key.startsWith("_")) {
        this._env[key] = args[key];
      }
    });
  }

  private configHome(): void {
    if (this._env["levainHome"]) {
      return;
    }

    let envDef = Deno.env.get("levainHome");
    console.log("envDef", envDef);
    if (envDef) {
      this._env["levainHome"] = path.resolve(envDef);
      return;
    }

    let home = this.homedir();
    if (home) {
      this._env["levainHome"] = path.resolve(home, "levain");
      return;
    }  
  }

  private configRepo(args: any): Repository {
    let repos:Repository[] = [];
    
    this.addLevainRegistry(repos);

    this.addLevainRepo(repos);
    this.addRepos(repos, args.addRepo);

    // CWD
    repos.push(new FileSystemRepository(this, Deno.cwd()));

    return new CacheRepository(this, 
      new ChainRepository(this, repos)
    );  
  }

  // TODO: We must find a standard Deno function for this!
  private homedir() : string {
    // Common option
    let home = Deno.env.get("home");
    if (home) {
      return home;
    }

    // Not found - Windows?
    let userprofile = Deno.env.get("userprofile");
    if (userprofile) {
      return userprofile;
    }

    let homedrive = Deno.env.get("homedrive");
    let homepath = Deno.env.get("homepath");
    if (homedrive && homepath) {
      return path.resolve(homedrive, homepath);
    }

    // What else?
    throw "No home for levain. Do you have a refrigerator?";
  }

  private get levainSrcDir(): string {
    // https://stackoverflow.com/questions/61829367/node-js-dirname-filename-equivalent-in-deno
    return path.resolve(path.dirname(path.fromFileUrl(import.meta.url)), "../..");
  }

  private addLevainRegistry(repos: Repository[]) {
    if (this.levainRegistry) {
      repos.push(new FileSystemRepository(this, this.levainRegistry));
    }
  }

  private addLevainRepo(repos: Repository[]) {
    repos.push(new FileSystemRepository(this, this.levainSrcDir));
  }
  
  private addRepos(repos: Repository[], addRepo: undefined|string|string[]) {
    if (addRepo) {
      let newRepos:string[] = [];
      if (typeof(addRepo) == "string") {
        newRepos.push(addRepo);
      } else {
        newRepos = addRepo;
      }

      for (let repo of newRepos) {
        try {
          const fileInfo = Deno.statSync(repo);
          if (!fileInfo || !fileInfo.isDirectory) {
              throw `addRepo - invalid dir ${repo}`;
          }
        } catch (err) {
          if (err.name != "NotFound") {
              throw err;
          }
        }

        repos.push(new FileSystemRepository(this, repo));
      }
    }
    repos.push(new NullRepository(this));
  }
}
