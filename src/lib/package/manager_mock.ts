import PackageManager from "./manager.ts";
import Package from "./package.ts";

export class PackageManagerMock extends PackageManager {
    resolvePackages(pkgNames: string[], installedOnly: boolean = false, showLog: boolean = true): Package[] | null {
        return []
    }
}
