import 'reflect-metadata'
import {injectable, Container} from 'inversify'

import Repository from './repository'
import ChainRepository from './repositories/chain'
import NullRepository from './repositories/null'
import FileSystemRepository from './repositories/fs'

@injectable()
export default class Config {
  get repositoryChain(): Repository {
    return new ChainRepository([
      new FileSystemRepository('C:\\bndes-java-env\\repo'),
      new FileSystemRepository('C:\\bndes-java-env\\repo2'),
      new NullRepository()
    ])
  }
}

export const container = new Container()
container.bind<Config>(Config).toSelf()
