import { BaseHandler, LevelName } from "@std/log";

export default class MemoryHandler extends BaseHandler {
  constructor(levelName: LevelName, options: any = {}) {
    // FIXME constructor(levelName: LevelName, options: HandlerOptions = {}) {
    super(levelName, options);
  }

  public messages: string[] = [];

  public override log(str: string): void {
    this.messages.push(str);
  }
}
