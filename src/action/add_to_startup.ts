import Package from '../lib/package/package.ts';
import Action from './action.ts';
import {parseArgs} from "../lib/parse_args.ts";
import { FileUtils } from "../lib/fs/file_utils.ts";
import * as log from "https://deno.land/std/log/mod.ts";
import {copySync, existsSync, walkSync} from "https://deno.land/std/fs/mod.ts";
import * as path from "https://deno.land/std/path/mod.ts";


export default class AddToStartupAction implements Action {
    execute(pkg: Package|undefined, parameters: string[]): Promise<void> {
        let args = parseArgs(parameters);
    
        if (!pkg) { 
            throw Error("No package for action copy")
        }

        let src = FileUtils.resolve(pkg.baseDir, args[0]);
        const dst = "%appdata%/Microsoft/Windows/Start Menu/Programs/Startup"
        //create shortcut here
        

        //copy here
        this.copySrcFromFileSystem(src, dst, true, args);

        throw new Error("Not fully implemented yet.");

    }

    private copySrcFromFileSystem(item: string, dst: string, copyToDir: boolean, args: any) {
        const fileInfo = Deno.statSync(item);
        if (args.strip && fileInfo.isDirectory) {
            for (const entry of walkSync(item)) {
                if (entry.path == item) {
                    continue;
                }

                const writeTo = path.resolve(dst, entry.name)
                this.doCopy(args, entry.path, writeTo);
            }
        } else {
            let realDst = dst;
            if (copyToDir) {
                realDst = path.resolve(dst, path.basename(item));
            }

            this.doCopy(args, item, realDst);
        }
    }

    
    private doCopy(args: any, src: string, dst: string) {
        if (args.verbose) {
            log.debug(`- COPY ${src} => ${dst}`);
        }

        try {
            copySync(src, dst, {overwrite: true});
        } catch (err) {
            log.error(`ERROR: COPY ${src} => ${dst} ${JSON.stringify(err)}`);
            throw err;
        }
    }
}
