import { parse } from "https://deno.land/std/flags/mod.ts";

class Opts {
    string?: string[];
    boolean?: string[]
}

export function parseArgs(args: string[], optsDef?: Opts): any {
    let opts:any = {
        stopEarly: true,
        unknown: (v:string) => { 
            if (v.startsWith("-")) {
                console.log("ERROR: Unknown option", v);
                return false;
            } else {
                return true;
            }
        }        
    }

    if (optsDef?.string) {
        opts.string = optsDef?.string;
    }

    if (optsDef?.boolean) {
        opts.boolean = optsDef?.boolean;
    }

    return parse(args, opts);
}
