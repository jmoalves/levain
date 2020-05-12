import {Command} from '@oclif/command'

import 'reflect-metadata'
import getDecorators from 'inversify-inject-decorators'
import Config, {container} from '../lib/config'
import Package from '../lib/package'
import Repository from '../lib/repository'

const {lazyInject} = getDecorators(container)

export default class InstallCommand extends Command {
  @lazyInject(Config)
  private _config: Config | undefined;

  static strict = false;

  async run() {
    if (!this._config) {
      // eslint-disable-next-line no-console
      console.error('No config')
      return
    }

    const {argv} = this.parse(InstallCommand)

    let error:boolean = false;
    let pkgs:Map<string, Package> = new Map();
    for (const pkgName of argv) {
      let myError:boolean = this.resolvePackages(this._config.repositoryChain, pkgs, pkgName);
      error = error || myError;
    }

    if (error) {
      this.error("");
      return 1;
    }

    this.log("");
    this.log("================");
    for (let pkg of pkgs.keys()) {
      this.log('install', pkg);
    }
  }

  private resolvePackages(repo:Repository, pkgs:Map<string, Package>, pkgName:string):boolean {
    if (pkgs.has(pkgName)) {
      return false;
    }

    const pkgDef = repo.resolvePackage(pkgName);
    if (!pkgDef) {
      this.error("PACKAGE NOT FOUND: " + pkgName);
      return true;
    }    

    // Busca dependências primeira - Ordenação topológica por busca em profundidade
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
}
