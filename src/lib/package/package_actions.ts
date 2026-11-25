import OsUtils from "../os/os_utils.ts";
import type Package from "./package.ts";

/**
 * Resolves recipe action lists for a given base key (e.g. `cmd.install`, `cmd.env`, `cmd.shell`)
 * by appending optional OS-specific blocks:
 *   1. `<baseKey>` (common actions on all operating systems)
 *   2. `<baseKey>.posix` (on Linux and macOS)
 *   3. `<baseKey>.<os>` (`windows`, `linux`, or `darwin`)
 */
export function resolvePackageActions(pkg: Package, baseKey: string): string[] {
  const actions: string[] = [];
  const append = (raw: unknown) => {
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (typeof item === "string") {
          actions.push(item);
        }
      }
    }
  };

  append(pkg.yamlItem(baseKey));
  if (OsUtils.isPosix()) {
    append(pkg.yamlItem(`${baseKey}.posix`));
  }
  append(pkg.yamlItem(`${baseKey}.${OsUtils.getOs()}`));
  return actions;
}
