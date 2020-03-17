import 'reflect-metadata'
import {injectable, Container} from 'inversify'

import Repository from './repository'
import ChainRepository from './repositories/chain'
import NullRepository from './repositories/null'

@injectable()
export default class Config {
  get repositoryChain(): Repository | null {
    return new ChainRepository([new NullRepository()])
  }
}

export const container = new Container()
container.bind<Config>(Config).toSelf()
