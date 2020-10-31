import * as path from "https://deno.land/std/path/mod.ts";

export var homedir = function(): string {
    // Common option
    let home = Deno.env.get("home");
    if (home) {
        return home;
    }

    // Not found - Windows?
    let userprofile = Deno.env.get("userprofile");
    if (userprofile) {
        return userprofile;
    }

    let homedrive = Deno.env.get("homedrive");
    let homepath = Deno.env.get("homepath");
    if (homedrive && homepath) {
        return path.resolve(homedrive, homepath);
    }

    // What else?
    throw "No home for levain. Do you have a refrigerator?";
}
