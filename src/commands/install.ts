import 'reflect-metadata'
import getDecorators from 'inversify-inject-decorators'
import {Command} from '@oclif/command'
import Config, {container} from '../lib/config'

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

    for (const pkg of argv) {
      const pkgDef = this._config.repositoryChain?.resolvePackage(pkg)
      this.log('install', pkgDef?.name, (pkgDef?.dependencies ? '=>' + pkgDef?.dependencies : ''))
    }
  }
}
