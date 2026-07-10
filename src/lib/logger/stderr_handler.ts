
import {
  BaseHandler,
  LogRecord,
} from "@std/log";

export class StderrConsoleHandler extends BaseHandler {
  override log(msg: string): void {
    console.error(msg);
  }
  
  override format(record: LogRecord): string {
    return this.formatter
      ? this.formatter(record)
      : `${record.levelName} ${record.msg}`;
  }

}
