import Repository from '../repository'
import Package from '../package'

export default class ChainRepository implements Repository {
  // eslint-disable-next-line no-useless-constructor
  constructor(private repositories: Repository[]) {
  }

  resolvePackage(packageName: string): Package | null {
    if (!this.repositories) {
      return null
    }

    for (const repo of this.repositories) {
      const pkg = repo.resolvePackage(packageName)
      if (pkg) {
        return pkg
      }
    }

    return null
  }
}
