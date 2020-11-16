import * as path from "https://deno.land/std/path/mod.ts";

export async function myCLI(): Promise<void> {
    console.log("Ok!");
}

if (import.meta.main) {
    myCLI();
}
