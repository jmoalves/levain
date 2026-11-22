import * as log from "@std/log";

export default class ConsoleFeedback {
  public static readonly MIN_INTERVAL_MS = 50;

  private static readonly text = ["-", "\\", "|", "/"];
  public static OUT = Deno.stdout;
  public static sanitize: (msg: string) => string = (msg) => msg;

  private idx = 0;
  private lastInc = new Date().getTime();

  constructor() {}

  start(msg: string | undefined = undefined) {
    if (msg) {
      const safeMsg = ConsoleFeedback.sanitize(msg);
      log.debug(safeMsg);
      ConsoleFeedback.OUT.writeSync(new TextEncoder().encode(`${safeMsg}`));
    }
    this.idx = 0;
  }

  show() {
    if (!ConsoleFeedback.OUT.isTerminal()) {
      return;
    }

    ConsoleFeedback.OUT.writeSync(new TextEncoder().encode(`\r${ConsoleFeedback.text[this.idx]}`));
    this.inc();
  }

  reset(msg: string | undefined = undefined) {
    this.idx = 0;
    if (msg) {
      const safeMsg = ConsoleFeedback.sanitize(msg);
      ConsoleFeedback.OUT.writeSync(new TextEncoder().encode(`\r${safeMsg}`));
    }
    ConsoleFeedback.OUT.writeSync(new TextEncoder().encode(`\r\n`));
  }

  private inc() {
    const now = new Date().getTime();
    if (now < (this.lastInc + ConsoleFeedback.MIN_INTERVAL_MS)) {
      return;
    }

    this.lastInc = now;
    this.idx++;
    if (this.idx >= ConsoleFeedback.text.length) {
      this.idx = 0;
    }
  }
}
