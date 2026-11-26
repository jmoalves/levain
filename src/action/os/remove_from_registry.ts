import t from "../../lib/i18n.ts";
import type Package from "../../lib/package/package.ts";
import { isReservedPackageName } from "../../lib/reserved_words.ts";
import type Registry from "../../lib/repository/registry.ts";

import type Action from "../action.ts";

export default class RemoveFromRegistry implements Action {
  constructor(
    private readonly registry: Registry,
  ) {
  }

  async execute(_pkg: Package | undefined, parameters: string[]): Promise<void> {
    if (parameters.length === 0) {
      throw new Error("Action - removeFromRegistry - You should inform at least one package to be removed");
    }

    for (const pkgName of parameters) {
      if (isReservedPackageName(pkgName)) {
        throw new Error(t("lib.reserved_words.packageCannotBeRemoved", { name: pkgName }));
      }
    }

    for (const pkgName of parameters) {
      await this.registry.remove(pkgName);
    }
  }
}
