import * as path from "@std/path";

// Paths based on levain executable directory
export default class LevainPaths {
  static get levainRootFile(): string {
    //https://stackoverflow.com/questions/76647896/determine-if-running-uncompiled-ts-script-or-compiled-deno-executable
    // SEE ALSO: scripts\levain-compile.cmd

    const isCompiled = Deno.args.includes("--is_compiled_binary");
    if (isCompiled) {
      return Deno.execPath();
    }
    // Considering src\lib\paths\levain_paths.ts
    const projectRoot = new URL("../../", import.meta.url);
    return path.resolve(path.join(path.fromFileUrl(projectRoot), "..", "levain.ts"));
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