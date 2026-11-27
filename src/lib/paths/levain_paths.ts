import * as path from "@std/path";

// Paths based on levain executable directory
export default class LevainPaths {
  static resolveRootFile(
    execPath: string,
    moduleUrl: string,
    isStandalone: boolean = Deno.build.standalone,
  ): string {
    if (isStandalone) {
      return execPath;
    }
    const modulePath = path.resolve(path.fromFileUrl(moduleUrl));
    // Source checkout layout: <root>/src/lib/paths/levain_paths.ts
    if (modulePath.replaceAll("\\", "/").endsWith("/src/lib/paths/levain_paths.ts")) {
      const projectRoot = new URL("../../", moduleUrl);
      return path.resolve(path.join(path.fromFileUrl(projectRoot), "..", "levain.ts"));
    }
    // Bundled JS layout: <installDir>/build/levain.bundle.js
    return modulePath;
  }

  static get levainRootFile(): string {
    return LevainPaths.resolveRootFile(Deno.execPath(), import.meta.url, Deno.build.standalone);
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