import * as log from "@std/log";

export default class LogUtils {
  // deno-lint-ignore require-await
  static async closeLogFiles() {
    return this.setupDefaultLogConfig();
  }

  static async setupDefaultLogConfig() {
    await log.setup({ handlers: {}, loggers: {} });
  }
}
