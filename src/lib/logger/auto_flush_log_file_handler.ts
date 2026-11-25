import * as log from "@std/log";

export class AutoFlushLogFileHandler extends log.FileHandler {
  public static readonly FLUSH_INTERVAL_MS = 250;
  private lastFlush = 0;
  private disabled = false;

  constructor(
    levelName: log.LevelName,
    fullOptions: any,
  ) {
    super(levelName, fullOptions);
  }

  override setup(): void {
    try {
      super.setup();
    } catch {
      // Another Levain instance may hold an exclusive lock on the shared log file;
      // degrade gracefully while the per-instance temp log continues capturing output.
      this.disabled = true;
    }
  }

  override log(msg: string): void {
    if (this.disabled) {
      return;
    }
    super.log(msg);
  }

  override flush(): void {
    if (this.disabled) {
      return;
    }
    super.flush();
    this.lastFlush = Date.now();
  }

  override destroy(): void {
    if (this.disabled) {
      return;
    }
    super.destroy();
  }

  override handle(logRecord: log.LogRecord): void {
    if (this.disabled) {
      return;
    }
    super.handle(logRecord);
    if (this.level > logRecord.level) {
      return;
    }

    const now = Date.now();
    if (
      logRecord.level >= log.LogLevels.WARN ||
      now - this.lastFlush >= AutoFlushLogFileHandler.FLUSH_INTERVAL_MS
    ) {
      this.flush();
    }
  }
}
