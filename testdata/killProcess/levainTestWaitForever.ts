import * as log from "https://deno.land/std/log/mod.ts";

const timer = (ms: number) => new Promise(res => setTimeout(res, ms))

while (true) {
    log.info("waiting...")
    await timer(60 * 1000)
}
