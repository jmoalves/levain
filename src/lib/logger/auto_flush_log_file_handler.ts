import * as log from "@std/log";

export class AutoFlushLogFileHandler extends log.FileHandler {
  public static readonly FLUSH_INTERVAL_MS = 250;
  private lastFlush = 0;

  constructor(
    levelName: log.LevelName,
    fullOptions: any,
  ) {
    super(levelName, fullOptions);
  }

  override flush(): void {
    super.flush();
    this.lastFlush = Date.now();
  }

  override handle(logRecord: log.LogRecord): void {
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
