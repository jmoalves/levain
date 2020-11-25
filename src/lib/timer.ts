// FIXME error: TS5056 [ERROR]: Cannot write file 'https://deno.land/x/deno_moment@v1.1.1/moment.js' because it would be overwritten by multiple input files.
// import {moment} from "https://deno.land/x/deno_moment/mod.ts";

export class Timer {
    startTime = performance.now()

    measure(): number {
        return performance.now() - this.startTime
    }

    humanize(): string {
        // return moment().duration(this.measure()).humanize()
        return `${this.measure()}`
    }
}