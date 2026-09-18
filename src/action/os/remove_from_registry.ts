import type Package from "../../lib/package/package.ts";
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

    const pkgName = parameters[0];
    await this.registry.remove(pkgName);
  }
}
