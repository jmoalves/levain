import * as log from "https://deno.land/std/log/mod.ts";

export default class ConsoleFeedback {
    private static readonly text = ["-", "\\", "|", "/"]
    private static readonly MIN_INC_MS = 500

    private idx = 0
    private lastInc = new Date().getTime()

    constructor() {}

    start(msg: string|undefined = undefined) {
        if (msg) {
            log.debug(msg)
            Deno.stdout.writeSync(new TextEncoder().encode(`${msg}`))
        }
        this.idx = 0
    }

    show() {
        if (!Deno.stdout.isTerminal()) {
            return
        }

        Deno.stdout.writeSync(new TextEncoder().encode(`\r${ConsoleFeedback.text[this.idx]}`))
        this.inc()
    }

    reset(msg: string|undefined = undefined) {
        this.idx = 0
        if (msg) {
            Deno.stdout.writeSync(new TextEncoder().encode(`\r${msg}`))
        }
        Deno.stdout.writeSync(new TextEncoder().encode(`\r\n`))
    }

    private inc() {
        let now = new Date().getTime()
        if (now < (this.lastInc + ConsoleFeedback.MIN_INC_MS)) {
            return
        }

        this.lastInc = now
        this.idx++
        if (this.idx >= ConsoleFeedback.text.length) {
            this.idx = 0
        }
    }
}
