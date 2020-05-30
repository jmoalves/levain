import Repository from './repository.ts'

export default class Package {
  private _dependencies: string[]|undefined = undefined;

  constructor(
        private _name: string,
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
      + "name=" + this.name 
      + ", yaml=" + this.yaml 
      + (this._yamlStruc ? ", pkgDef=" + JSON.stringify(this._yamlStruc) : "")
      + (this.dependencies ? ", deps=" + this.dependencies : "") 
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
