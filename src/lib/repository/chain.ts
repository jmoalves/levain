import Repository from './repository.ts'
import Package from '../package/package.ts'
import Config from "../config.ts";

export default class ChainRepository implements Repository {
  constructor(private config:Config, private repositories: Repository[]) {
  }

  resolvePackage(packageName: string): Package | undefined {
    if (!this.repositories) {
      return undefined;
    }

    for (const repo of this.repositories) {
      const pkg = repo.resolvePackage(packageName)
      if (pkg) {
        return pkg;
      }
    }

    return undefined;
  }
}
