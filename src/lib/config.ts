import * as log from "https://deno.land/std/log/mod.ts";

import * as path from "https://deno.land/std/path/mod.ts";

import { homedir } from './utils.ts';

import Repository from './repository/repository.ts'
import CacheRepository from './repository/cache.ts'
import ChainRepository from './repository/chain.ts'
import FileSystemRepository from './repository/fs.ts'
import PackageManager from "./package/manager.ts";

export default class Config {
  private _pkgManager: PackageManager;
  private _repository: Repository;
  private _env:any = {};
  private _context:any = {}; // Do we really need two of them (_env and _context)?

  constructor(args: any) {
    this.configEnv(args);
    this.configHome();
    this._repository = this.configRepo(args);
    this._pkgManager = new PackageManager(this);

    log.info(`Config: \n${JSON.stringify(this._env, null, 3)}`);
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

  get context(): any {
    return this._context;
  }
  
  setVar(name: string, value: string): void {
    this._env[name] = value;
  }
  
  replaceVars(text: string, pkgName?: string|undefined): string {
    let myText:string = text;
    let vars = myText.match(/\${[^${}]+}/);
    while (vars) {
      for (let v of vars) {
        let vName = v.replace("$", "").replace("{", "").replace("}", "");
        let value: string|undefined = undefined;

        if (!value && vName.search(/^pkg\.(.+)\.([^.]*)/) != -1) {
          let pkgVarPkg = vName.replace(/^pkg\.(.+)\.([^.]*)/, "$1");
          let pkgVarName = vName.replace(/^pkg\.(.+)\.([^.]*)/, "$2");
          value = this.packageManager.getVar(pkgVarPkg, pkgVarName);
        }

        if (!value) {
          value = Deno.env.get(vName);
        }

        if (!value && this._env) {
          value = this._env[vName];
        }

        if (!value && pkgName) {
          value = this.packageManager.getVar(pkgName, vName);
        }

        if (!value && vName == "home") {
          value = homedir();
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

    let levainHome = Deno.env.get("levainHome");
    if (levainHome) {
      this._env["levainHome"] = path.resolve(levainHome);
      log.info(`SET levainHome=${this._env["levainHome"]}`)
      return;
    }

    let home = homedir();
    if (home) {
      this._env["levainHome"] = path.resolve(home, "levain");
      log.info(`DEFAULT levainHome=${this._env["levainHome"]}`)
      return;
    }  
  }

  private configRepo(args: any): Repository {
    let repos:Repository[] = [];
    
    this.addLevainRepo(repos);
    this.addRepos(repos, args.addRepo);

    // CWD
    repos.push(new FileSystemRepository(this, Deno.cwd()));

    return new CacheRepository(this, 
      new ChainRepository(this, repos)
    );  
  }

  private get levainSrcDir(): string {
    // https://stackoverflow.com/questions/61829367/node-js-dirname-filename-equivalent-in-deno
    return path.resolve(path.dirname(path.fromFileUrl(import.meta.url)), "../..");
  }

  private addLevainRepo(repos: Repository[]) {
    repos.push(new FileSystemRepository(this, this.levainSrcDir));
  }
  
  private addRepos(repos: Repository[], addRepo: undefined|string[]) {
    if (!addRepo) {
      return;
    }

    addRepo?.forEach((repo) => {
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

      let repoPath = path.resolve(repo);
      repos.push(new FileSystemRepository(this, repoPath));
    });
  }
}
