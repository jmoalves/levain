import * as path from "https://deno.land/std/path/mod.ts";

import Package from './package.ts';

import Repository from './repository.ts'
import CacheRepository from './repositories/cache.ts'
import ChainRepository from './repositories/chain.ts'
import NullRepository from './repositories/null.ts'
import FileSystemRepository from './repositories/fs.ts'

export default class Config {
  private _levainHome: string|undefined;
  private _repository: Repository;

  constructor() {
    let home = this.homedir();
    if (home) {
      this._levainHome = path.resolve(home, "levain");
      console.log("DEFAULT levainHome:", this._levainHome);
    }

    this._repository = new CacheRepository(this, 
      new ChainRepository(this, [
        new FileSystemRepository(this, '.'),
        // new FileSystemRepository('C:\\bndes-java-env.kit\\repo'),
        // new FileSystemRepository('C:\\bndes-java-env.kit\\repo2'),
        new NullRepository(this)
      ])
    );
  }

  get levainHome(): string|undefined {
    return this._levainHome;
  }

  get repository(): Repository {
    return this._repository;
  }

  replaceVars(pkg:Package, text: string): string {
    let pkgConfig = pkg.yamlItem("config");

    let myText = text;

    let vars = myText.match(/\${[^${}]+}/);
    if (vars) {
      for (let v of vars) {
        let vName = v.replace("$", "").replace("{", "").replace("}", "");
        let value: string|undefined = undefined;

        if (pkgConfig) {
          value = pkgConfig[vName];
        }

        if (value) {
          myText = myText.replace(v, value);  
        }
      }
    }

    return myText;
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
