import * as log from "jsr:@std/log";
import * as path from "jsr:@std/path";

import { sleepRandomAmountOfSeconds } from "https://deno.land/x/sleep/mod.ts";

export var homedir = function (): string {
    // Common option
    let home = Deno.env.get("HOME");
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

// https://github.com/caspervonb/deno-prompts/blob/master
export function promptSecret(message: string): string | undefined {
    Deno.stdout.writeSync(new TextEncoder().encode(message));

    Deno.stdin.setRaw(true);

    let input = "";
    while (true) {
        const data = new Uint8Array(1);
        const nread = Deno.stdin.readSync(data);
        if (!nread) {
            break;
        }

        const string = new TextDecoder().decode(data.slice(0, nread));

        for (const char of string) {
            switch (char) {
                case "\u0003":
                case "\u0004":
                    Deno.stdin.setRaw(false);
                    return undefined;

                case "\r":
                case "\n":
                    Deno.stdin.setRaw(false);
                    return input;

                case "\u0008":
                    input = input.slice(0, input.length - 1);
                    break;

                default:
                    input += char;
                    break;
            }
        }
    }

    return undefined;
}

export function envChain(...names: string[]): string | undefined {
    for (let name of names) {
        let value = Deno.env.get(name);
        if (value) {
            return value;
        }
    }

    return undefined;
}

export async function retry(maxAttempts: number, codeToRun:(() => void), sleepAmountMax: number = 5): Promise<void> {
    let lastError = undefined

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            codeToRun()
            return
        } catch (error) {
            log.warn(`RETRY - Ignoring ${error}`)
            lastError = error
            await sleepRandomAmountOfSeconds(0, Math.max(1, sleepAmountMax))
        }
    }

    throw lastError
}
