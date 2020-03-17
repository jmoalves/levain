import Repository from '../repository'
import Package from '../package'

export default class NullRepository implements Repository {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resolvePackage(packageName: string): Package | null {
    // return null
    return new Package(packageName, packageName)
  }
}
