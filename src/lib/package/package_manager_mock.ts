import PackageManager from "./package_manager.ts";
import Package from "./package.ts";

export class PackageManagerMock extends PackageManager {
  override resolvePackages(_pkgNames: string[], _installedOnly: boolean = false, _showLog: boolean = true): Package[] | null {
    return [];
  }
}
