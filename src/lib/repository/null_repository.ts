import Config from "../config.ts";
import Package from "../package/package.ts";

import AbstractRepository from "./abstract_repository.ts";

export default class NullRepository extends AbstractRepository {
  constructor(private config: Config) {
    super("nullRepo");
  }

  // deno-lint-ignore require-await
  async init(): Promise<void> {
    this.setInitialized();
  }

  invalidatePackages() {
  }

  resolvePackage(_packageName: string): Package | undefined {
    return undefined;
  }

  listPackages(): Array<Package> {
    return [];
  }

  // deno-lint-ignore require-await
  async readPackages(): Promise<Array<Package>> {
    return [];
  }

  reload(): Promise<void> {
    return Promise.resolve();
  }
}
