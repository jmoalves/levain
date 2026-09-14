import * as path from "@std/path";

// Paths based on HOME dir
export default class HomePaths {
  static homedir(): string {
    // Common option
    const home = Deno.env.get("HOME");
    if (home) {
      return home;
    }
  
    // Not found - Windows?
    const userprofile = Deno.env.get("userprofile");
    if (userprofile) {
      return userprofile;
    }
  
    const homedrive = Deno.env.get("homedrive");
    const homepath = Deno.env.get("homepath");
    if (homedrive && homepath) {
      return path.resolve(homedrive, homepath);
    }
  
    // What else?
    throw "No home for levain. Do you have a refrigerator?";
  }

  static get levainConfigFile(): string {
    return path.resolve(HomePaths.homedir(), "levain.config.json");
  }

  static get levainFallbackHome(): string {
    return path.resolve(HomePaths.homedir(), "levain");
  }

  static profileCandidates(home?: string): string[] {
    if (home === undefined) {
      home = HomePaths.homedir();
    }
    return [
      path.join(home, ".bashrc"),
      path.join(home, ".bash_profile"),
      path.join(home, ".profile"),
    ];
  }
}