import Repository from '../repository'
import Package from '../package'

export default class ChainRepository implements Repository {
  private cache:Map<string, Package> = new Map();

  // eslint-disable-next-line no-useless-constructor
  constructor(private repositories: Repository[]) {
  }

  resolvePackage(packageName: string): Package | undefined {
    if (this.cache.has(packageName)) {
      return this.cache.get(packageName);
    }
    
    if (!this.repositories) {
      return undefined
    }

    for (const repo of this.repositories) {
      const pkg = repo.resolvePackage(packageName)
      if (pkg) {
        return pkg
      }
    }

    return undefined
  }
}
