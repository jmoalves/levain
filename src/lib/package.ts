export default class Package {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    private _name: string,
    private _rootDir: string,
    private _dependencies?: Package[]) {
  }

  get name() {
    return this._name
  }

  get rootDir() {
    return this._rootDir
  }

  get dependencies() {
    return this._dependencies
  }
}
