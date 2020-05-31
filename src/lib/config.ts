import * as path from "https://deno.land/std/path/mod.ts";

import Package from './package.ts';

import Repository from './repository.ts'
import CacheRepository from './repositories/cache.ts'
import ChainRepository from './repositories/chain.ts'
import NullRepository from './repositories/null.ts'
import FileSystemRepository from './repositories/fs.ts'

export default class Config {
  private _repository: Repository;
  private _env:any = {};

  constructor(args: any) {
    this.configEnv(args);
    this.configHome();
    this._repository = this.configRepo();

    console.log("Config:");
    console.log(JSON.stringify(this._env, null, 3));
  }

  get repository(): Repository {
    return this._repository;
  }

  replaceVars(pkg:Package, text: string): string {
    let pkgConfig = pkg.yamlItem("config");

    let myText = text;
    let vars = myText.match(/\${[^${}]+}/)
    while (vars) {
      for (let v of vars) {
        let vName = v.replace("$", "").replace("{", "").replace("}", "");
        let value: string|undefined = undefined;
        
        if (!value && this._env) {
          value = this._env[vName];
        }
        
        if (!value) {
          value = pkg.yamlItem(vName);
        }

        if (!value && pkgConfig) {
          value = pkgConfig[vName];
        }

        if (value) {
          myText = myText.replace(v, value);  
        } else {
          throw `${v} is undefined`;
        }
      }
 
      vars = myText.match(/\${[^${}]+}/)
    }

    return myText;
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

    let home = this.homedir();
    if (home) {
      this._env["levainHome"] = path.resolve(home, "levain");
      return;
    }  
  }

  private configRepo(): Repository { 
    return new CacheRepository(this, 
      new ChainRepository(this, [
        new FileSystemRepository(this, '.'),
        new NullRepository(this)
      ])
    );  
  }

  // TODO: We must find a standard Deno function for this!
  private homedir() : string|undefined {
    // Common option
    let home = Deno.env.get("home");
    if (home) {
      return home;
    }

    // Not found - Windows?
    let homedrive = Deno.env.get("homedrive");
    let homepath = Deno.env.get("homepath");

    if (homedrive && homepath) {
      return path.resolve(homedrive, homepath);
    }

    // What else?
    return undefined;
  }
}
