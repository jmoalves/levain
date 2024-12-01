import * as log from "jsr:@std/log";

const timer = (ms: number) => new Promise(res => setTimeout(res, ms))

while (true) {
    log.info("waiting...")
    await timer(60 * 1000)
}
