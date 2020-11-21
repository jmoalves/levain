import Repository from './repository.ts'
import Package from '../package/package.ts'
import Config from "../config.ts";

export default class NullRepository implements Repository {
  constructor(private config:Config) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resolvePackage(packageName: string): Package | undefined {
    return undefined;
  }

  name = 'nullRepo';
}
