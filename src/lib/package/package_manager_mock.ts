import PackageManager from "./package_manager.ts";
import Package from "./package.ts";

export class PackageManagerMock extends PackageManager {
  override resolvePackages(pkgNames: string[], installedOnly: boolean = false, showLog: boolean = true): Package[] | null {
    return [];
  }
}
