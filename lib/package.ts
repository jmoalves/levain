import Repository from './repository.ts'

export default class Package {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    private _name: string,
    private _yamlFile: string,
    private _yamlStruc: any,
    private _repo?: Repository) {
  }

  get name(): string {
    return this._name
  }

  get yaml(): string {
    return this._yamlFile
  }

  get dependencies(): string[]|undefined {
    if (this._yamlStruc) {
      if (this._yamlStruc.dependencies) {
        return this._yamlStruc.dependencies;
      }
    }

    return undefined;
  }

  get repo(): Repository|undefined {
    return this._repo;
  }

  toString(): string {
    return "Package[" 
      + "name=" + this.name 
      + ", yaml=" + this.yaml 
      + (this._yamlStruc ? ", pkgDef=" + JSON.stringify(this._yamlStruc) : "")
      + (this.dependencies ? ", deps=" + this.dependencies : "") 
      + "]"
  }
}
