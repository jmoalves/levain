import * as path from "@std/path";

// Paths based on levain executable directory
export default class LevainPaths {
  static resolveRootFile(args: readonly string[], execPath: string, moduleUrl: string): string {
    // https://stackoverflow.com/questions/76647896/determine-if-running-uncompiled-ts-script-or-compiled-deno-executable
    // SEE ALSO: scripts/levain-build.cmd, githubScripts/levain-build.sh, levain.cmd, levain.ps1, levain.sh
    if (args.includes("--is_compiled_binary")) {
      return execPath;
    }
    if (args.includes("--is_bundled_js")) {
      return path.resolve(path.fromFileUrl(moduleUrl));
    }
    // Considering src/lib/paths/levain_paths.ts
    const projectRoot = new URL("../../", moduleUrl);
    return path.resolve(path.join(path.fromFileUrl(projectRoot), "..", "levain.ts"));
  }

  static get levainRootFile(): string {
    return LevainPaths.resolveRootFile(Deno.args, Deno.execPath(), import.meta.url);
  }

  static get levainRootDir(): string {
    return path.dirname(LevainPaths.levainRootFile);
  }

  static get levainSrcDir(): string {
    return path.resolve(LevainPaths.levainRootDir);
  }

  static get levainRecipesDir(): string {
    return path.resolve(LevainPaths.levainSrcDir, "recipes");
  }

  static get levainRecipePath(): string {
    return path.resolve(LevainPaths.levainRecipesDir, "levain.levain.yaml");
  }

}