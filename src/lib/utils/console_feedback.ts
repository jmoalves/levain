import * as log from "@std/log";

export default class ConsoleFeedback {
  public static readonly MIN_INTERVAL_MS = 50;

  private static readonly encoder = new TextEncoder();
  private static readonly frames = ["-", "\\", "|", "/"].map((ch) =>
    ConsoleFeedback.encoder.encode(`\r${ch}`)
  );
  private static readonly crlf = ConsoleFeedback.encoder.encode("\r\n");

  public static OUT = Deno.stdout;
  public static sanitize: (msg: string) => string = (msg) => msg;

  private static activeCount = 0;
  private static cachedOutRef: typeof Deno.stdout | undefined;
  private static cachedIsTerminal = false;

  private idx = 0;
  private lastWrite = 0;
  private started = false;

  constructor() {}

  private static isOutputTerminal(): boolean {
    if (ConsoleFeedback.cachedOutRef !== ConsoleFeedback.OUT) {
      ConsoleFeedback.cachedOutRef = ConsoleFeedback.OUT;
      ConsoleFeedback.cachedIsTerminal = ConsoleFeedback.OUT.isTerminal();
    }
    return ConsoleFeedback.cachedIsTerminal;
  }

  start(msg: string | undefined = undefined) {
    if (!this.started) {
      this.started = true;
      ConsoleFeedback.activeCount++;
    }
    if (msg) {
      const safeMsg = ConsoleFeedback.sanitize(msg);
      log.debug(safeMsg);
      if (ConsoleFeedback.activeCount <= 1) {
        ConsoleFeedback.OUT.writeSync(ConsoleFeedback.encoder.encode(`${safeMsg}`));
      }
    }
    this.idx = 0;
    this.lastWrite = 0;
  }

  show() {
    if (ConsoleFeedback.activeCount > 1 || !ConsoleFeedback.isOutputTerminal()) {
      return;
    }

    const now = Date.now();
    if (this.lastWrite !== 0 && now < this.lastWrite + ConsoleFeedback.MIN_INTERVAL_MS) {
      return;
    }

    ConsoleFeedback.OUT.writeSync(ConsoleFeedback.frames[this.idx]);
    this.lastWrite = now;
    this.idx = (this.idx + 1) % ConsoleFeedback.frames.length;
  }

  reset(msg: string | undefined = undefined) {
    const concurrent = ConsoleFeedback.activeCount > 1;
    if (this.started) {
      this.started = false;
      ConsoleFeedback.activeCount = Math.max(0, ConsoleFeedback.activeCount - 1);
    }

    this.idx = 0;
    this.lastWrite = 0;
    if (msg) {
      const safeMsg = ConsoleFeedback.sanitize(msg);
      const prefix = concurrent ? "" : "\r";
      ConsoleFeedback.OUT.writeSync(ConsoleFeedback.encoder.encode(`${prefix}${safeMsg}`));
    }
    ConsoleFeedback.OUT.writeSync(ConsoleFeedback.crlf);
  }
}
