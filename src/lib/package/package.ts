import * as path from "https://deno.land/std/path/mod.ts";
import * as yaml from "https://deno.land/std/encoding/yaml.ts";
import { existsSync } from "https://deno.land/std/fs/mod.ts";

import Repository from '../repository/repository.ts'
import Config from "../config.ts";

export default class Package {
  private _version: string;
  private _dependencies: string[]|undefined = undefined;
  private _yamlStruct: any;

  constructor(
        private config: Config,
        private _name: string,
        private _baseDir: string,
        private _yamlFile: string,
        yamlStr: string,
        private _repo?: Repository) {
    this._yamlStruct = yaml.parse(yamlStr);

    this._version = this._yamlStruct.version;
    if (this._yamlStruct.dependencies) {
      this._dependencies = this._yamlStruct.dependencies;
    }
    this._dependencies = this.normalizeDeps(this._dependencies);
  }

  get name(): string {
    return this._name
  }

  get version(): string {
    return this._version;
  }

  get baseDir(): string {
    return path.resolve(this._baseDir);
  }

  get pkgDir(): string {
    return path.resolve(path.dirname(this.yaml));
  }

  get yaml(): string {
    return this._yamlFile
  }

  get dependencies(): string[]|undefined {
    return this._dependencies;
  }

  get repo(): Repository|undefined {
    return this._repo;
  }

  get installed(): boolean {
    let registry = path.resolve(this.config.levainRegistry, path.basename(this.yaml));
    return existsSync(registry);
  }

  get yamlStruct(): any {
    return this._yamlStruct;
  }

  yamlItem(key: string): any|undefined {
    if (this._yamlStruct) {
      return this._yamlStruct[key];
    }

    return undefined;
  }

  toString(): string {
    return "Package[" 
      + this.name 
      + " v" + this.version 
      + ", baseDir=" + this.baseDir 
      + (this.dependencies ? ", deps=" + this.dependencies : "") 
      + ", yaml=" + this.yaml 
      + "]"
  }

  private normalizeDeps(deps: string[]|undefined): string[]|undefined {
    if (this._name == "levain") {
      return undefined;
    }

    let set:Set<string> = new Set<string>();
    set.add("levain"); // first dependency

    if (deps) {
      deps.forEach(v => set.add(v));
    }

    return [...set];
  }
}
