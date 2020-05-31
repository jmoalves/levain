import Repository from './repository.ts'

export default class Package {
  private _dependencies: string[]|undefined = undefined;

  constructor(
        private _name: string,
        private _version: string,
        private _baseDir: string,
        private _yamlFile: string,
        private _yamlStruc: any,
        private _repo?: Repository) {
    if (this._yamlStruc) {
      if (this._yamlStruc.dependencies) {
        this._dependencies = this._yamlStruc.dependencies;
      }
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
    return this._baseDir;
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

  yamlItem(key: string): any|undefined {
    if (this._yamlStruc) {
      return this._yamlStruc[key];
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
